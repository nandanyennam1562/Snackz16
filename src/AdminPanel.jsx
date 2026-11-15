import { useState, useEffect } from 'react'
import { 
  ShieldCheck, ArrowLeft, Package, DollarSign, 
  TrendingUp, CheckCircle2, Clock, Plus, Trash2, Edit2, RefreshCw 
} from 'lucide-react'
import { supabase } from './lib/supabase'
import './AdminPanel.css'

export default function AdminPanel({ onBackToStore }) {
  const [activeTab, setActiveTab] = useState('analytics') // 'analytics' | 'orders' | 'inventory'
  const [analyticsFilter, setAnalyticsFilter] = useState('daily') // 'daily' | 'weekly' | 'monthly'
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [storeOpen, setStoreOpen] = useState(true)
  const [settingsId, setSettingsId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Product form state
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productForm, setProductForm] = useState({
    name: '', category: 'Snacks', price: '', cost_price: '', stock: '', size_label: '', image_url: ''
  })

  // Restock Modal state
  const [restockProduct, setRestockProduct] = useState(null)
  const [restockQty, setRestockQty] = useState('')
  const [restockCost, setRestockCost] = useState('')

  async function loadAdminData() {
    setLoading(true)
    setError('')

    try {
      const [ordersRes, productsRes, settingsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, order_items(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('*')
          .order('name', { ascending: true }),
        supabase
          .from('store_settings')
          .select('*')
          .limit(1)
      ])

      if (ordersRes.error) throw ordersRes.error
      if (productsRes.error) throw productsRes.error

      setOrders(ordersRes.data || [])
      setProducts(productsRes.data || [])

      if (settingsRes.data && settingsRes.data.length > 0) {
        setStoreOpen(Boolean(settingsRes.data[0].accepting_orders))
        setSettingsId(settingsRes.data[0].id)
      }
    } catch (err) {
      setError(err.message || 'Failed to load admin data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  async function toggleStoreStatus() {
    const newStatus = !storeOpen
    try {
      let query = supabase
        .from('store_settings')
        .update({ accepting_orders: newStatus })

      if (settingsId) {
        query = query.eq('id', settingsId)
      }

      const { error } = await query
      if (error) throw error

      setStoreOpen(newStatus)
    } catch (err) {
      alert('Failed to update store status: ' + err.message)
    }
  }

  async function markAsDelivered(orderId) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId)

      if (error) throw error
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'delivered' } : o))
    } catch (err) {
      alert('Failed to update order status: ' + err.message)
    }
  }

  async function handleRestockSubmit(e) {
    e.preventDefault()
    if (!restockProduct) return

    const addQty = parseInt(restockQty)
    const batchCost = parseFloat(restockCost)

    if (isNaN(addQty) || addQty <= 0 || isNaN(batchCost) || batchCost < 0) {
      alert('Please enter a valid quantity and cost price.')
      return
    }

    const currentStock = Number(restockProduct.stock) || 0
    const currentCost = Number(restockProduct.cost_price) || 0

    // Calculate new weighted average cost
    let newWeightedCost = batchCost
    if (currentStock > 0) {
      const totalValue = (currentStock * currentCost) + (addQty * batchCost)
      newWeightedCost = totalValue / (currentStock + addQty)
    }

    const newStock = currentStock + addQty

    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          stock: newStock,
          cost_price: Number(newWeightedCost.toFixed(2))
        })
        .eq('id', restockProduct.id)

      if (error) throw error

      setRestockProduct(null)
      setRestockQty('')
      setRestockCost('')
      loadAdminData()
    } catch (err) {
      alert('Failed to restock: ' + err.message)
    }
  }

  async function handleSaveProduct(e) {
    e.preventDefault()
    try {
      const payload = {
        name: productForm.name,
        category: productForm.category,
        price: parseFloat(productForm.price),
        cost_price: parseFloat(productForm.cost_price || 0),
        stock: parseInt(productForm.stock),
        size_label: productForm.size_label,
        image_url: productForm.image_url,
        is_active: true
      }

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('products')
          .insert([payload])
        if (error) throw error
      }

      setShowProductModal(false)
      setEditingProduct(null)
      setProductForm({ name: '', category: 'Snacks', price: '', cost_price: '', stock: '', size_label: '', image_url: '' })
      loadAdminData()
    } catch (err) {
      alert('Error saving product: ' + err.message)
    }
  }

  async function handleDeleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
      if (error) throw error
      setProducts(prev => prev.filter(p => p.id !== productId))
    } catch (err) {
      alert('Failed to delete product: ' + err.message)
    }
  }

  // --- ANALYTICS CALCULATIONS ---
  const now = new Date()

  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at)
    if (analyticsFilter === 'daily') {
      return orderDate.toDateString() === now.toDateString()
    } else if (analyticsFilter === 'weekly') {
      const weekAgo = new Date()
      weekAgo.setDate(now.getDate() - 7)
      return orderDate >= weekAgo
    } else if (analyticsFilter === 'monthly') {
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear()
    }
    return true
  })

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

  // Profit calculation using locked historical order_items.unit_cost
  const totalProfit = filteredOrders.reduce((orderSum, order) => {
    const itemsProfit = (order.order_items || []).reduce((itemSum, item) => {
      const cost = Number(item.unit_cost || 0)
      return itemSum + ((Number(item.unit_price) - cost) * Number(item.quantity))
    }, 0)
    return orderSum + itemsProfit
  }, 0)

  // --- ITEM SALES LEADERBOARD ---
  const itemSalesMap = {}
  orders.forEach(order => {
    (order.order_items || []).forEach(item => {
      if (!itemSalesMap[item.product_name]) {
        itemSalesMap[item.product_name] = { quantity: 0, revenue: 0 }
      }
      itemSalesMap[item.product_name].quantity += Number(item.quantity)
      itemSalesMap[item.product_name].revenue += Number(item.line_total || (item.unit_price * item.quantity))
    })
  })

  const leaderboard = Object.keys(itemSalesMap)
    .map(name => ({
      name,
      quantity: itemSalesMap[name].quantity,
      revenue: itemSalesMap[name].revenue
    }))
    .sort((a, b) => b.quantity - a.quantity) // Decreasing order of sales

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-brand">
          <ShieldCheck size={26} color="#ff792e" />
          <h1>Admin <span>Dashboard</span></h1>
        </div>

        {/* Store Status Toggle & Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: storeOpen ? '#e8f5ed' : '#ffebee', padding: '6px 14px', borderRadius: '20px', border: `1px solid ${storeOpen ? '#16834b' : '#c62828'}` }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: storeOpen ? '#16834b' : '#c62828', marginRight: '8px', display: 'inline-block' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: storeOpen ? '#16834b' : '#c62828' }}>
              {storeOpen ? 'Accepting Orders' : 'Store Closed'}
            </span>
            <button 
              onClick={toggleStoreStatus}
              style={{ marginLeft: '10px', background: storeOpen ? '#c62828' : '#16834b', color: 'white', border: 0, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
            >
              {storeOpen ? 'Close Store' : 'Open Store'}
            </button>
          </div>

          <button className="back-store-btn" onClick={onBackToStore} type="button">
            <ArrowLeft size={16} />
            Back to Store
          </button>
        </div>
      </header>

      {/* Admin Nav Tabs */}
      <div className="admin-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #eceef3', paddingBottom: '15px', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('analytics')}
          style={{ background: activeTab === 'analytics' ? '#ff792e' : '#f0f2f5', color: activeTab === 'analytics' ? 'white' : '#20283a', border: 0, padding: '10px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          📊 Analytics & Bestsellers
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          style={{ background: activeTab === 'orders' ? '#ff792e' : '#f0f2f5', color: activeTab === 'orders' ? 'white' : '#20283a', border: 0, padding: '10px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          📦 Orders ({orders.filter(o => o.status === 'pending').length} Pending)
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          style={{ background: activeTab === 'inventory' ? '#ff792e' : '#f0f2f5', color: activeTab === 'inventory' ? 'white' : '#20283a', border: 0, padding: '10px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          🏪 Inventory & Restock
        </button>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}

      {loading ? (
        <div className="admin-loading"><div className="loader" /><p>Loading dashboard...</p></div>
      ) : (
        <>
          {/* ================= TAB 1: ANALYTICS & BESTSELLERS ================= */}
          {activeTab === 'analytics' && (
            <div className="analytics-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0, color: '#20283a' }}>Revenue & Profit Summary</h3>
                <div style={{ display: 'flex', background: '#eceef3', padding: '4px', borderRadius: '8px' }}>
                  {['daily', 'weekly', 'monthly'].map(period => (
                    <button
                      key={period}
                      onClick={() => setAnalyticsFilter(period)}
                      style={{
                        background: analyticsFilter === period ? 'white' : 'transparent',
                        color: analyticsFilter === period ? '#ff792e' : '#6b7280',
                        border: 0, padding: '6px 14px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                        boxShadow: analyticsFilter === period ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              {/* Financial Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #eceef3' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#8b93a2', fontSize: '14px', fontWeight: 600 }}>
                    <span>Total Revenue</span>
                    <DollarSign size={20} color="#16834b" />
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#20283a', marginTop: '10px' }}>
                    ₹{totalRevenue.toFixed(2)}
                  </div>
                  <span style={{ fontSize: '12px', color: '#8b93a2', marginTop: '5px', display: 'block' }}>
                    Based on {filteredOrders.length} orders ({analyticsFilter})
                  </span>
                </div>

                <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #eceef3' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#8b93a2', fontSize: '14px', fontWeight: 600 }}>
                    <span>Actual Profit</span>
                    <TrendingUp size={20} color="#ff792e" />
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#16834b', marginTop: '10px' }}>
                    ₹{totalProfit.toFixed(2)}
                  </div>
                  <span style={{ fontSize: '12px', color: '#8b93a2', marginTop: '5px', display: 'block' }}>
                    Calculated using historical batch cost prices
                  </span>
                </div>
              </div>

              {/* Item Sales Leaderboard (Decreasing order) */}
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #eceef3', marginTop: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <Package size={22} color="#ff792e" />
                  <h3 style={{ margin: 0, color: '#20283a' }}>Most Popular Items (Bestsellers)</h3>
                </div>

                {leaderboard.length === 0 ? (
                  <p style={{ color: '#8b93a2', textAlign: 'center', padding: '30px' }}>No items sold yet.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #eceef3', color: '#8b93a2', fontSize: '13px' }}>
                          <th style={{ padding: '12px' }}>Rank</th>
                          <th style={{ padding: '12px' }}>Snack Name</th>
                          <th style={{ padding: '12px' }}>Units Sold</th>
                          <th style={{ padding: '12px' }}>Total Sales Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((item, index) => (
                          <tr key={item.name} style={{ borderBottom: '1px solid #f0f2f5', fontSize: '14px' }}>
                            <td style={{ padding: '12px', fontWeight: 700, color: index === 0 ? '#ff792e' : '#20283a' }}>
                              #{index + 1} {index === 0 ? '🔥' : ''}
                            </td>
                            <td style={{ padding: '12px', fontWeight: 600, color: '#20283a' }}>{item.name}</td>
                            <td style={{ padding: '12px', fontWeight: 700 }}>{item.quantity} units</td>
                            <td style={{ padding: '12px', color: '#16834b', fontWeight: 700 }}>₹{item.revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 2: ORDERS MANAGEMENT ================= */}
          {activeTab === 'orders' && (
            <div className="orders-grid">
              {orders.length === 0 ? (
                <div className="admin-empty"><p>No orders received yet.</p></div>
              ) : (
                orders.map(order => {
                  const isDelivered = order.status === 'delivered'
                  return (
                    <div className="order-card" key={order.id}>
                      <div className="order-card-header">
                        <div>
                          <strong>{order.customer_name}</strong>
                          <span style={{ color: '#8b93a2', fontSize: '12px', display: 'block' }}>Room {order.room_number}</span>
                        </div>
                        <span className="order-amount">₹{Number(order.total_amount).toFixed(2)}</span>
                      </div>

                      <div className="order-items-list" style={{ margin: '10px 0' }}>
                        {order.order_items?.map(item => (
                          <div className="order-item-row" key={item.id}>
                            <span>{item.quantity}x {item.product_name}</span>
                            <span>₹{Number(item.line_total || (item.quantity * item.unit_price)).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                        <span style={{ 
                          padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                          background: isDelivered ? '#e8f5ed' : '#fff8f0',
                          color: isDelivered ? '#16834b' : '#d97706'
                        }}>
                          {isDelivered ? 'Delivered' : 'Pending Delivery'}
                        </span>

                        {!isDelivered && (
                          <button 
                            onClick={() => markAsDelivered(order.id)}
                            style={{ background: '#16834b', color: 'white', border: 0, padding: '8px 14px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ================= TAB 3: INVENTORY & RESTOCK ================= */}
          {activeTab === 'inventory' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#20283a' }}>Manage Products & Restock Batches</h3>
                <button 
                  onClick={() => { setEditingProduct(null); setProductForm({ name: '', category: 'Snacks', price: '', cost_price: '', stock: '', size_label: '', image_url: '' }); setShowProductModal(true); }}
                  style={{ background: '#ff792e', color: 'white', border: 0, padding: '10px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} /> Add New Snack
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {products.map(product => (
                  <div key={product.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #eceef3', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <img src={product.image_url || 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=100'} alt={product.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }} />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, color: '#20283a', fontSize: '15px' }}>{product.name}</h4>
                        <span style={{ color: '#8b93a2', fontSize: '12px' }}>Sell: ₹{product.price} | Avg Cost: ₹{product.cost_price || 0}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fc', padding: '10px 12px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: product.stock <= 5 ? '#e03e3e' : '#20283a' }}>
                        Stock: {product.stock} units
                      </span>
                      <button 
                        onClick={() => { setRestockProduct(product); setRestockQty(''); setRestockCost(product.cost_price || ''); }}
                        style={{ background: '#16834b', color: 'white', border: 0, padding: '6px 12px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <RefreshCw size={13} /> Restock
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                      <button 
                        onClick={() => { setEditingProduct(product); setProductForm(product); setShowProductModal(true); }}
                        style={{ flex: 1, background: '#f0f2f5', color: '#20283a', border: 0, padding: '8px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        style={{ background: '#ffebee', color: '#c62828', border: 0, padding: '8px 12px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Restock Batch Modal */}
      {restockProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#20283a' }}>Restock: {restockProduct.name}</h3>
            <p style={{ color: '#8b93a2', fontSize: '13px', marginBottom: '20px' }}>Current Stock: {restockProduct.stock} units | Current Cost: ₹{restockProduct.cost_price || 0}</p>
            
            <form onSubmit={handleRestockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Quantity to Add</label>
                <input type="number" required min="1" value={restockQty} onChange={e => setRestockQty(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #dfe3ec', boxSizing: 'border-box' }} placeholder="e.g. 20" />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Cost Price for this Batch (₹ per unit)</label>
                <input type="number" step="0.01" required min="0" value={restockCost} onChange={e => setRestockCost(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #dfe3ec', boxSizing: 'border-box' }} placeholder="e.g. 15" />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setRestockProduct(null)} style={{ flex: 1, background: '#f0f2f5', color: '#20283a', border: 0, padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, background: '#16834b', color: 'white', border: 0, padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Confirm Restock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showProductModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#20283a' }}>{editingProduct ? 'Edit Snack' : 'Add New Snack'}</h3>
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Snack Name</label>
                <input type="text" required value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #dfe3ec', boxSizing: 'border-box' }} placeholder="e.g. Lays Magic Masala" />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Selling Price (₹)</label>
                  <input type="number" step="0.01" required value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #dfe3ec', boxSizing: 'border-box' }} placeholder="20" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Initial Cost Price (₹)</label>
                  <input type="number" step="0.01" value={productForm.cost_price} onChange={e => setProductForm({ ...productForm, cost_price: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #dfe3ec', boxSizing: 'border-box' }} placeholder="15" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Initial Stock</label>
                  <input type="number" required value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #dfe3ec', boxSizing: 'border-box' }} placeholder="50" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Size / Variant</label>
                  <input type="text" value={productForm.size_label} onChange={e => setProductForm({ ...productForm, size_label: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #dfe3ec', boxSizing: 'border-box' }} placeholder="50g pack" />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Image URL</label>
                <input type="url" value={productForm.image_url} onChange={e => setProductForm({ ...productForm, image_url: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #dfe3ec', boxSizing: 'border-box' }} placeholder="https://..." />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowProductModal(false)} style={{ flex: 1, background: '#f0f2f5', color: '#20283a', border: 0, padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, background: '#ff792e', color: 'white', border: 0, padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Save Snack</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}