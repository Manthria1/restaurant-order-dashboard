const globalStore = global.__RETELL_STORE__ || {
  clients: [],
  orders: []
};
global.__RETELL_STORE__ = globalStore;
export default globalStore;
