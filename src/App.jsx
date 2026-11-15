import { useEffect, useMemo, useState } from 'react'
import {
  ShoppingBag, Search, ShoppingCart, Plus,
  Minus, Package, Clock, Store, Utensils,
  LogIn, LogOut, ShieldCheck, ClipboardList
} from 'lucide-react'
import { supabase } from './lib/supabase'
import Auth from './Auth'
import CartDrawer from './CartDrawer'
import AdminPanel from './AdminPanel'
import MyOrders from './MyOrders'
import './App.css'

function App() {
  const [products, setProducts] = useState([])
  const [acceptingOrders, setAcceptingOrders] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState({})
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [isAdminView, setIsAdminView] = useState(false)
  const [isMyOrdersView, setIsMyOrdersView] = useState(false)

  async function loadStore() {
    setLoading(true)
    setError('')

    const [productResult, settingsResult] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),

      supabase
        .from('store_settings')
        .select('accepting_orders')
        .eq('id', 1)
        .single()
    ])

    if (productResult.error || settingsResult.error) {
      setError('Unable to load the store. Please refresh the page.')
    } else {
      setProducts(productResult.data || [])
      setAcceptingOrders(settingsResult.data.accepting_orders)
    }

    setLoading(false)
  }

  async function checkAdminRole(userId) {
    if (!userId) {
      setIsAdmin(false)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!error && data && data.role === 'admin') {
      setIsAdmin(true)
    } else {
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    loadStore()
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        const currentUser = data.session?.user ?? null
        setUser(currentUser)
        if (currentUser) checkAdminRole(currentUser.id)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (currentUser) {
          checkAdminRole(currentUser.id)
        } else {
          setIsAdmin(false)
          setIsAdminView(false)
          setIsMyOrdersView(false)
        }
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const categories = useMemo(() => [
    'All',
    ...new Set(products.map(p => p.category || 'Other'))
  ], [products])

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.toLowerCase())

    const matchesCategory =
      category === 'All' || product.category === category

    return matchesSearch && matchesCategory
  })

  const cartCount = Object.values(cart).reduce(
    (total, quantity) => total + quantity, 0
  )

  const cartTotal = products.reduce(
    (total, product) =>
      total + product.price * (cart[product.id] || 0),
    0
  )

  function addToCart(product) {
    if (!user) {
      setShowAuth(true)
      return
    }

    if (!acceptingOrders || product.stock <= (cart[product.id] || 0)) {
      return
    }

    setCart(previous => ({
      ...previous,
      [product.id]: (previous[product.id] || 0) + 1
    }))
  }

  function removeFromCart(product) {
    setCart(previous => {
      const updated = { ...previous }
      const quantity = (updated[product.id] || 0) - 1

      if (quantity <= 0) {
        delete updated[product.id]
      } else {
        updated[product.id] = quantity
      }

      return updated
    })
  }

  function handleOpenCart() {
    if (!user) {
      setShowAuth(true)
      return
    }
    setCartOpen(true)
  }

  if (showAuth && !user) {
    return <Auth />
  }

  if (isAdminView && isAdmin) {
    return <AdminPanel onBackToStore={() => { setIsAdminView(false); loadStore(); }} />
  }

  if (isMyOrdersView && user) {
    return <MyOrders onBackToStore={() => setIsMyOrdersView(false)} />
  }

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="/">
          <span className="brand-icon">
            <ShoppingBag size={23} />
          </span>
          <span>Snack<span className="brand-highlight">Zone</span></span>
        </a>

        <div className="nav-right">
          <div className={`store-status ${acceptingOrders ? 'open' : 'closed'}`}>
            <span className="status-dot" />
            {acceptingOrders ? 'Orders Open' : 'Orders Closed'}
          </div>

          {isAdmin && (
            <button
              className="cart-button admin-nav-button"
              type="button"
              onClick={() => setIsAdminView(true)}
            >
              <ShieldCheck size={18} />
              <span>Admin</span>
            </button>
          )}

          {user && (
            <button
              className="cart-button"
              type="button"
              onClick={() => setIsMyOrdersView(true)}
              style={{ background: '#f7f8fc', color: '#20283a', border: '1px solid #dfe3ec' }}
            >
              <ClipboardList size={18} />
              <span>My Orders</span>
            </button>
          )}

          <button
            className="cart-button"
            type="button"
            onClick={handleOpenCart}
          >
            <ShoppingCart size={19} />
            <span>Cart</span>
            <span className="cart-count">{cartCount}</span>
          </button>

          {user ? (
            <button
              className="cart-button"
              onClick={async () => {
                await supabase.auth.signOut()
                setCart({})
                setCartOpen(false)
                setIsAdmin(false)
                setIsAdminView(false)
                setIsMyOrdersView(false)
              }}
            >
              <LogOut size={17} />
              Logout
            </button>
          ) : (
            <button
              className="cart-button"
              onClick={() => setShowAuth(true)}
            >
              <LogIn size={17} />
              Login
            </button>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <span className="hero-label">
              <Utensils size={15} /> YOUR HOSTEL SNACK STORE
            </span>

            <h1>
              Cravings?<br />
              We've got <span>you covered.</span>
            </h1>

            <p>
              Your favourite snacks, drinks and treats,
              just a few clicks away.
            </p>

            <a href="#products" className="hero-button">
              Explore snacks <ShoppingBag size={17} />
            </a>
          </div>

          <div className="hero-decoration">
            <div className="hero-circle">
              <span>🍿</span>
              <span>🍫</span>
              <span>🥤</span>
            </div>
            <div className="hero-caption">GOOD FOOD. GOOD MOOD.</div>
          </div>
        </section>

        <section className="store-section" id="products">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE SNACK COLLECTION</span>
              <h2>Explore our snacks</h2>
              <p>Find something delicious today.</p>
            </div>

            <div className="product-count">
              <Package size={17} />
              {products.length} products
            </div>
          </div>

          <div className="search-bar">
            <Search size={19} />
            <input
              type="text"
              placeholder="Search for snacks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="categories">
            {categories.map(item => (
              <button
                key={item}
                className={`category-button ${category === item ? 'active' : ''}`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {error && (
            <div className="message error-message">
              {error}
              <button onClick={loadStore}>Retry</button>
            </div>
          )}

          {loading ? (
            <div className="empty-state">
              <div className="loader" />
              <p>Loading delicious snacks...</p>
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map(product => {
                const quantity = cart[product.id] || 0
                const unavailable = product.stock <= 0
                const maxReached = quantity >= product.stock

                return (
                  <article className="product-card" key={product.id}>
                    <div className="product-image">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                        />
                      ) : (
                        <div className="image-placeholder">
                          <ShoppingBag size={42} />
                        </div>
                      )}

                      <span className="product-category">
                        {product.category || 'Other'}
                      </span>
                    </div>

                    <div className="product-details">
                      <h3>{product.name}</h3>
                      <p className="product-size">{product.size_label}</p>

                      <div className="stock-label">
                        {unavailable
                          ? 'Out of stock'
                          : `${product.stock} available`}
                        </div>

                      <div className="product-bottom">
                        <span className="product-price">
                          ₹{Number(product.price).toFixed(2)}
                        </span>

                        {acceptingOrders && !unavailable ? (
                          <div className="quantity-control">
                            {quantity > 0 && (
                              <button onClick={() => removeFromCart(product)}>
                                <Minus size={15} />
                              </button>
                            )}

                            <span>{quantity > 0 ? quantity : ''}</span>

                            <button
                              onClick={() => addToCart(product)}
                              disabled={maxReached}
                            >
                              <Plus size={17} />
                            </button>
                          </div>
                        ) : (
                          <button className="add-button" disabled>
                            {unavailable ? 'Sold out' : 'Closed'}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <div className="empty-state">
              <ShoppingBag size={38} />
              <h3>No snacks found</h3>
              <p>Try another search or category.</p>
            </div>
          )}
        </section>

        <section
          className="cart-summary"
          style={{ cursor: 'pointer' }}
          onClick={handleOpenCart}
        >
          <div>
            <ShoppingCart size={21} />
            <div>
              <strong>Your cart</strong>
              <p>{cartCount} items added · Click to review & checkout</p>
            </div>
          </div>

          <div className="summary-right">
            <strong>₹{cartTotal.toFixed(2)}</strong>
            <span>Cart total</span>
          </div>
        </section>

        {!acceptingOrders && (
          <div className="closed-notice">
            <Clock size={19} />
            Orders are currently closed. Please check back later.
          </div>
        )}
      </main>

      <footer>
        <Store size={17} />
        <span>SnackZone · Made for hostel life</span>
      </footer>

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        products={products}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        clearCart={() => setCart({})}
        onOrderSuccess={loadStore}
        acceptingOrders={acceptingOrders}
      />
    </div>
  )
}

export default App