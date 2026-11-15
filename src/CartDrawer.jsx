import { useState } from 'react'
import { X, Plus, Minus, ShoppingBag, CheckCircle2, ArrowRight } from 'lucide-react'
import { supabase } from './lib/supabase'

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  products,
  addToCart,
  removeFromCart,
  clearCart,
  onOrderSuccess,
  acceptingOrders
}) {
  const [customerName, setCustomerName] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [orderPlacedId, setOrderPlacedId] = useState(null)

  if (!isOpen) return null

  const cartItems = products
    .filter(product => (cart[product.id] || 0) > 0)
    .map(product => ({
      ...product,
      quantity: cart[product.id]
    }))

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  )

  async function handleCheckout(e) {
    e.preventDefault()
    setError('')

    if (!customerName.trim() || !roomNumber.trim()) {
      setError('Please enter both your name and room number.')
      return
    }

    setSubmitting(true)

    try {
      const itemsPayload = cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity
      }))

      const { data, error: rpcError } = await supabase.rpc('place_order', {
        p_customer_name: customerName.trim(),
        p_room_number: roomNumber.trim(),
        p_items: itemsPayload
      })

      if (rpcError) throw rpcError

      setOrderPlacedId(data)
      clearCart()
      onOrderSuccess()
    } catch (err) {
      setError(err.message || 'Failed to place order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setOrderPlacedId(null)
    setError('')
    onClose()
  }

  return (
    <div className="drawer-overlay" onClick={handleClose}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">
            <ShoppingBag size={20} />
            <h2>Your Cart</h2>
          </div>
          <button className="drawer-close" onClick={handleClose} type="button">
            <X size={20} />
          </button>
        </div>

        {orderPlacedId ? (
          <div className="drawer-success">
            <CheckCircle2 size={48} className="success-icon" />
            <h3>Order Placed!</h3>
            <p>
              Thanks <strong>{customerName}</strong>! Your snacks are being prepared and will be delivered to{' '}
              <strong>Room {roomNumber}</strong>.
            </p>
            <span className="order-ref">
              Order ID: #{String(orderPlacedId).slice(0, 8).toUpperCase()}
            </span>
            <button className="checkout-button" onClick={handleClose} type="button">
              Back to Store
            </button>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="drawer-empty">
            <ShoppingBag size={42} />
            <h3>Your cart is empty</h3>
            <p>Add some snacks from the menu to get started.</p>
          </div>
        ) : (
          <div className="drawer-body">
            <div className="drawer-items">
              {cartItems.map(item => (
                <div className="drawer-item" key={item.id}>
                  <div className="drawer-item-info">
                    <strong>{item.name}</strong>
                    <span>₹{Number(item.price).toFixed(2)} each</span>
                  </div>

                  <div className="quantity-control">
                    <button type="button" onClick={() => removeFromCart(item)}>
                      <Minus size={14} />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      disabled={item.quantity >= item.stock}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form className="checkout-form" onSubmit={handleCheckout}>
              <h3>Delivery Details</h3>

              <label>Your Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                required
              />

              <label>Room Number</label>
              <input
                type="text"
                placeholder="e.g., 204"
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                required
              />

              {error && <div className="drawer-error">{error}</div>}

              <div className="drawer-footer">
                <div className="drawer-total">
                  <span>Total to pay</span>
                  <strong>₹{totalAmount.toFixed(2)}</strong>
                </div>

                <button
                  type="submit"
                  className="checkout-button"
                  disabled={submitting || !acceptingOrders}
                >
                  {submitting
                    ? 'Placing order...'
                    : !acceptingOrders
                      ? 'Store Closed'
                      : 'Place Order'}
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}