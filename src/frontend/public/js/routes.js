import Login from './views/Login.js'
import Dashboard from './views/Dashboard.js'
import Subscriptions from './views/Subscriptions.js'
import SubscriptionDetail from './views/SubscriptionDetail.js'
import Nodes from './views/Nodes.js'
import Users from './views/Users.js'
import Profile from './views/Profile.js'

export default [
    {
        path: '/login',
        component: Login
    },
    {
        path: '/',
        redirect: '/dashboard',
        meta: { requiresAuth: true }
    },
    {
        path: '/dashboard',
        component: Dashboard,
        meta: { requiresAuth: true }
    },
    {
        path: '/subscriptions',
        component: Subscriptions,
        meta: { requiresAuth: true }
    },
    {
        path: '/subscriptions/:id',
        component: SubscriptionDetail,
        meta: { requiresAuth: true }
    },
    {
        path: '/nodes',
        component: Nodes,
        meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
        path: '/users',
        component: Users,
        meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
        path: '/profile',
        component: Profile,
        meta: { requiresAuth: true }
    }
] 