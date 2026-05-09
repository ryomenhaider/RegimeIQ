import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [betaCodes, setBetaCodes] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', plan: 'free' });
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin');
      return;
    }
    // Restore token to authStore so API interceptor can use it
    setAuth(token, 'admin', 'admin', 900);
    loadData();
  }, [navigate, setAuth]);

  const loadData = async () => {
    setLoading(true);
    
    try {
      if (activeTab === 'overview') {
        const [usersRes, metricsRes] = await Promise.all([
          api.get('/admin/users', { params: { limit: 10 } }),
          api.get('/admin/metrics')
        ]);
        setUsers(usersRes.data.data.users || []);
        setMetrics(metricsRes.data.data);
      } else if (activeTab === 'users') {
        const res = await api.get('/admin/users', { params: { limit: 100 } });
        setUsers(res.data.data.users || []);
      } else if (activeTab === 'beta-codes') {
        const res = await api.get('/admin/beta-codes', { params: { limit: 50 } });
        setBetaCodes(res.data.data.codes || []);
      }
    } catch (error) {
      console.error('Error loading data:', error.response?.data || error.message);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBetaCode = async () => {
    try {
      const res = await api.post('/admin/beta-codes/generate', { expires_days: 30 });
      toast.success('Beta code generated');
      setBetaCodes([res.data.data, ...betaCodes]);
    } catch (error) {
      toast.error('Failed to generate code');
    }
  };

  const handleRevokeCode = async (code) => {
    try {
      await api.post(`/admin/beta-codes/${code}/revoke`, {});
      toast.success('Code revoked');
      loadData();
    } catch (error) {
      toast.error('Failed to revoke code');
    }
  };

  const handleBanUser = async (username) => {
    try {
      await api.post(`/admin/users/${username}/ban`, {});
      toast.success(`User ${username} banned`);
      loadData();
    } catch (error) {
      toast.error('Failed to ban user');
    }
  };

  const handleDeleteUser = async (username) => {
    if (!confirm(`Delete user ${username}?`)) return;
    try {
      await api.delete(`/admin/users/${username}`);
      toast.success(`User ${username} deleted`);
      loadData();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin');
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', newUser);
      toast.success('User created successfully');
      setShowAddUser(false);
      setNewUser({ username: '', email: '', password: '', plan: 'free' });
      loadData();
    } catch (error) {
      console.error('Create user error:', error.response?.data);
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to create user';
      toast.error(msg);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'beta-codes', label: 'Beta Codes' },
    { id: 'config', label: 'Config' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <button onClick={handleLogout} className="text-red-400 hover:text-red-300">
          Logout
        </button>
      </header>

      <div className="flex">
        <nav className="w-48 bg-gray-800 min-h-screen p-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); loadData(); }}
              className={`block w-full text-left px-4 py-2 rounded mb-1 ${
                activeTab === tab.id ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 p-6">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="text-2xl font-bold">{users.length}</div>
                      <div className="text-gray-400">Users</div>
                    </div>
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="text-2xl font-bold">{metrics?.websocket_connections || 0}</div>
                      <div className="text-gray-400">WebSocket Connections</div>
                    </div>
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="text-2xl font-bold">{metrics?.redis_memory_mb || 0}MB</div>
                      <div className="text-gray-400">Redis Memory</div>
                    </div>
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="text-2xl font-bold">{metrics?.binance_streams_active || 0}</div>
                      <div className="text-gray-400">Binance Streams</div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded p-4">
                    <h2 className="text-lg font-bold mb-4">Recent Users</h2>
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-400">
                          <th className="pb-2">Username</th>
                          <th className="pb-2">Email</th>
                          <th className="pb-2">Plan</th>
                          <th className="pb-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.slice(0, 5).map(user => (
                          <tr key={user.username} className="border-t border-gray-700">
                            <td className="py-2">{user.username}</td>
                            <td className="py-2">{user.email}</td>
                            <td className="py-2">{user.plan}</td>
                            <td className="py-2">
                              <button
                                onClick={() => handleBanUser(user.username)}
                                className="text-red-400 hover:text-red-300 mr-2"
                              >
                                Ban
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.username)}
                                className="text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">All Users</h2>
                    <button
                      onClick={() => setShowAddUser(true)}
                      className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
                    >
                      Add User
                    </button>
                  </div>

                  {showAddUser && (
                    <div className="bg-gray-800 rounded p-4 mb-4">
                      <h3 className="text-lg font-bold mb-4">Create New User</h3>
                      <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Username</label>
                            <input
                              type="text"
                              value={newUser.username}
                              onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Email</label>
                            <input
                              type="email"
                              value={newUser.email}
                              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Password</label>
                            <input
                              type="password"
                              value={newUser.password}
                              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                              required
                              minLength={8}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Plan</label>
                            <select
                              value={newUser.plan}
                              onChange={(e) => setNewUser({...newUser, plan: e.target.value})}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                            >
                              <option value="free">Free</option>
                              <option value="trial">Trial</option>
                              <option value="basic">Basic</option>
                              <option value="pro">Pro</option>
                              <option value="unlimited">Unlimited</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="bg-green-600 px-4 py-2 rounded hover:bg-green-700">
                            Create User
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddUser(false)}
                            className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="bg-gray-800 rounded p-4">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-400">
                          <th className="pb-2">Username</th>
                          <th className="pb-2">Email</th>
                          <th className="pb-2">Plan</th>
                          <th className="pb-2">Created</th>
                          <th className="pb-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(user => (
                          <tr key={user.username} className="border-t border-gray-700">
                            <td className="py-2">{user.username}</td>
                            <td className="py-2">{user.email}</td>
                            <td className="py-2">{user.plan}</td>
                            <td className="py-2">{new Date(user.created_at).toLocaleDateString()}</td>
                            <td className="py-2">
                              <button
                                onClick={() => handleBanUser(user.username)}
                                className="text-red-400 hover:text-red-300 mr-2"
                              >
                                Ban
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.username)}
                                className="text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'beta-codes' && (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <h2 className="text-lg font-bold">Beta Codes</h2>
                    <button
                      onClick={handleGenerateBetaCode}
                      className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Generate Code
                    </button>
                  </div>

                  <div className="bg-gray-800 rounded p-4">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-400">
                          <th className="pb-2">Code</th>
                          <th className="pb-2">Expires</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2">Created By</th>
                          <th className="pb-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {betaCodes.map(code => (
                          <tr key={code.code} className="border-t border-gray-700">
                            <td className="py-2 font-mono text-sm">{code.code}</td>
                            <td className="py-2">
                              {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="py-2">
                              <span className={code.is_revoked ? 'text-red-400' : 'text-green-400'}>
                                {code.is_revoked ? 'Revoked' : 'Active'}
                              </span>
                            </td>
                            <td className="py-2">{code.created_by}</td>
                            <td className="py-2">
                              {!code.is_revoked && (
                                <button
                                  onClick={() => handleRevokeCode(code.code)}
                                  className="text-yellow-400 hover:text-yellow-300"
                                >
                                  Revoke
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'config' && (
                <div className="bg-gray-800 rounded p-4">
                  <h2 className="text-lg font-bold mb-4">System Config</h2>
                  <p className="text-gray-400">Config editor coming soon...</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}