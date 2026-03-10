import { useEffect, useState, useRef } from 'react';

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.value = 0.04;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, 140);
  } catch (e) { }
}

export default function Home() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ totalOrdersToday: 0, totalRevenue: 0 });
  const [filter, setFilter] = useState('all');
  const [muted, setMuted] = useState(false);
  const [sseStatus, setSseStatus] = useState('connecting');
  const esRef = useRef(null);
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';

  // fetch orders snapshot
  const fetchOrders = async () => {
    try{
      const r = await fetch('/api/orders');
      const d = await r.json();
      const enriched = (d.orders || []).map(o=> ({ status: o.status || 'new', ...o }));
      setOrders(enriched);
      setStats(d.stats || {});
      return d;
    }catch(e){ console.warn('fetchOrders failed', e); }
  };

  useEffect(() => {
    fetchOrders();

    const es = new EventSource('/api/events');
    es.onopen = () => { console.log('[SSE] open'); setSseStatus('connected'); };
    es.onclose = () => { console.log('[SSE] closed'); setSseStatus('closed'); };
    es.onerror = (e) => { console.log('[SSE] error', e); setSseStatus('error'); };
    es.onmessage = (ev) => {
      try{
        const payload = JSON.parse(ev.data);
        if (payload.type === 'snapshot'){
          const enriched = (payload.orders || []).map(o=> ({ status: o.status || 'new', ...o }));
          setOrders(enriched);
        } else if (payload.type === 'order'){
          const newOrder = { status: payload.order.status || 'new', ...payload.order };
          setOrders(prev => [newOrder, ...prev].slice(0,10));
          setStats(s => ({...s, totalOrdersToday: (s.totalOrdersToday||0)+1, totalRevenue: Number(s.totalRevenue||0)+Number(payload.order.total||0)}));
          if (!muted) playBeep();
        } else if (payload.type === 'update'){
          setOrders(prev => prev.map(o => o.id === payload.order.id ? payload.order : o));
        }
      }catch(e){ console.warn('SSE parse failed', e); }
    };
    es.onerror = () => { es.close(); };
    esRef.current = es;
    return ()=> es.close();
  }, [muted]);

  const refreshOrders = () => { console.log('refreshOrders clicked'); return fetchOrders(); };

  const toggleMute = () => { console.log('toggleMute clicked ->', !muted); setMuted(m => !m); };

  const handleFilterClick = (f) => { console.log('filter clicked', f); setFilter(f); };

  const updateOrderStatus = async (id, status) => {
    console.log('updateOrderStatus', id, status);
    try {
      const res = await fetch('/api/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === id ? ({ ...o, status }) : o));
      }
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(new Date().toLocaleDateString(undefined, {weekday:'long', year:'numeric', month:'long', day:'numeric'}));
  }, []);

  return (
    <div className="container">
      <div className="app">
        <aside className="sidebar">
          <div>
            <div className="brand-row">
              <div className="side-logo">餐</div>
              <div>
                <div style={{fontWeight:800}}>Golden Dragon</div>
                <div className="muted" style={{fontSize:13}}>Order Management</div>
              </div>
            </div>

            <nav className="nav">
              <a className="active"><div className="icon"/> Dashboard</a>
              <a><div className="icon"/> History</a>
              <a><div className="icon"/> Analytics</a>
            </nav>
          </div>

          <div className="sidebar-footer">© 2024 Golden Dragon</div>
        </aside>

        <main className="main">
          <div className="page-head">
            <div>
              <div className="page-title">Order Dashboard</div>
              <div className="muted">{today}</div>
            </div>
            <div className="controls">
              <button id="mute-btn" className="btn" onClick={toggleMute} aria-pressed={muted}>{muted? '🔕' : '🔔'}</button>
              <button id="refresh-btn" className="btn" onClick={refreshOrders}>Refresh</button>
            </div>
          </div>

          <div className="stats-cards">
            <div className="stat-card">
              <div className="label">Active Orders</div>
              <div className="value">{orders.length}</div>
            </div>
            <div className="stat-card">
              <div className="label">New Orders</div>
              <div className="value">{orders.filter(o => o.status === 'new').length}</div>
            </div>
            <div className="stat-card">
              <div className="label">Ready for Pickup</div>
              <div className="value">{orders.filter(o => o.status === 'ready').length}</div>
            </div>
            <div className="stat-card">
              <div className="label">Today's Revenue</div>
              <div className="value">{currency}{Number(stats.totalRevenue||0).toFixed(2)}</div>
            </div>
          </div>

          <div className="content">
            <div className="content-left">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <div style={{display:'flex',gap:8}}>
                    <button id="filter-all" className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={()=>handleFilterClick('all')}>All Active</button>
                    <button id="filter-new" className={`filter-btn ${filter === 'new' ? 'active' : ''}`} onClick={()=>handleFilterClick('new')}>New</button>
                    <button id="filter-preparing" className={`filter-btn ${filter === 'preparing' ? 'active' : ''}`} onClick={()=>handleFilterClick('preparing')}>Preparing</button>
                    <button id="filter-ready" className={`filter-btn ${filter === 'ready' ? 'active' : ''}`} onClick={()=>handleFilterClick('ready')}>Ready</button>
                </div>
                <div className="muted">Needs attention</div>
              </div>

              {orders.filter(o => filter==='all' ? true : o.status === filter).length===0 ? (
                <div className="placeholder">
                  <div className="icon">📦</div>
                  <div style={{fontWeight:700,marginTop:8}}>No active orders</div>
                  <div className="muted">New orders will appear here</div>
                </div>
              ) : (
                <div className="order-item-list">
                  {orders.filter(o => o.status !== 'done').filter(o => filter==='all' ? true : o.status === filter).map(o => (
                    <div className="order-card" key={o.id} data-order-id={o.id} id={`order-${o.id}`}>
                      <div className="order-header">
                        <div className="order-status">
                          {o.status === 'new' && <span className="status-badge new">New Order</span>}
                          {o.status === 'preparing' && <span className="status-badge preparing">Preparing</span>}
                          {o.status === 'ready' && <span className="status-badge ready">Ready for Pickup</span>}
                        </div>
                        <div className="order-time">{o.pickupTime || 'ASAP'}</div>
                      </div>
                      <div className="order-details">
                        <div className="customer-info">
                          <div className="customer-name">{o.customerName}</div>
                          <div className="customer-phone">📞 {o.phone}</div>
                        </div>
                        <div className="order-items">
                          {Array.isArray(o.items) && o.items.map((item, idx) => (
                            <div key={idx} className="item-line">
                              <span>{item.quantity || 1}x {item.item_name || item.name || item}</span>
                              <span>{currency}{(item.price ? Number(item.price) * (item.quantity || 1) : 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        {o.raw?.call?.call_analysis?.custom_analysis_data?.special_instructions && (
                          <div className="special-instructions">
                            <strong>Note:</strong> {o.raw.call.call_analysis.custom_analysis_data.special_instructions}
                          </div>
                        )}
                        <div className="order-total">
                          <span>Total</span>
                          <span>{currency}{Number(o.total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="order-actions">
                        {o.status === 'new' && <button className="action-btn primary" onClick={()=>updateOrderStatus(o.id,'preparing')}>Start Preparing</button>}
                        {o.status === 'preparing' && <button className="action-btn secondary" onClick={()=>updateOrderStatus(o.id,'ready')}>Mark as Ready</button>}
                        {o.status === 'ready' && <button className="action-btn done" onClick={()=>updateOrderStatus(o.id,'done')}>Mark as Done</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <aside className="content-right">
              <div className="history-panel">
                <div style={{fontWeight:700}}>History</div>
                <div className="muted" style={{marginTop:8}}>Recent completed orders</div>
                <div style={{marginTop:10}}>
                  {orders.slice(0,6).map(o=> (
                    <div key={o.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f1f1f1'}}>
                      <div style={{fontSize:13}}>{o.customerName}</div>
                      <div className="muted">{currency}{Number(o.total||0).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="history-panel">
                <div style={{fontWeight:700}}>How to test</div>
                <div className="muted" style={{marginTop:8}}>Send a test webhook to the public URL (see README)</div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
