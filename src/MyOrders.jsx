import { useState, useEffect } from 'react'
import { ShoppingBag, Clock, CheckCircle2, ArrowLeft, Package } from 'lucide-react'
import { supabase } from './lib/supabase'
import './AdminPanel.css' // Reuses clean dashboard styling

export default function MyOrders({ onBackToStore }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadMyOrders() {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be logged in to view your orders.')

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load your orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMyOrders()
  }, [])

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-brand">
          <ShoppingBag size={24} color="#ff792e" />
          <h1>My <span>Orders</span></h1>
        </div>

        <button className="back-store-btn" onClick={onBackToStore} type="button">
          <ArrowLeft size={16} />
          Back to Store
        </button>
      </header>

      {error && <div className="admin-error-banner">{error}</div>}

      {loading ? (
        <div className="admin-loading">
          <div className="loader" />
          <p>Loading your order history...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="admin-empty" style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '12px', border: '1px solid #eceef3' }}>
          <Package size={48} color="#8b93a2" />
          <h3 style={{ marginTop: '15px', color: '#20283a' }}>No orders placed yet</h3>
          <p style={{ color: '#8b93a2', fontSize: '14px', marginTop: '5px' }}>Your snack orders will appear here once you check out.</p>
          <button 
            onClick={onBackToStore}
            style={{ marginTop: '20px', background: '#ff792e', color: 'white', border: 0, padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >
            Browse Snacks
          </button>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map(order => {
            const isDelivered = order.status === 'delivered'

            return (
              <div className="order-card" key={order.id}>
                <div className="order-card-header">
                  <div>
                    <strong>Order #{order.id.slice(0, 8)}</strong>
                    <span style={{ color: '#8b93a2', fontSize: '12px', display: 'block' }}>Room {order.room_number}</span>
                  </div>
                  <span className="order-amount">₹{Number(order.total_amount).toFixed(2)}</span>
                </div>

                <div className="order-meta">
                  <span>Ordered: {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="order-items-list" style={{ margin: '10px 0' }}>
                  {order.order_items?.map(item => (
                    <div className="order-item-row" key={item.id}>
                      <span>{item.quantity}x {item.product_name}</span>
                      <span>₹{Number(item.line_total || (item.quantity * item.unit_price)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ 
                  marginTop: '10px', 
                  padding: '10px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontSize: '13px', 
                  fontWeight: 700,
                  background: isDelivered ? '#e8f5ed' : '#fff8f0',
                  color: isDelivered ? '#16834b' : '#d97706'
                }}>
                  {isDelivered ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                  {isDelivered ? 'Delivered successfully' : 'Preparing / Out for delivery'}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}