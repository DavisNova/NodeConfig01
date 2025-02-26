import { createRouter, createWebHistory } from 'vue-router'
import store from './store'
import { message } from 'ant-design-vue'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('./views/Login.js'),
        meta: { 
            title: '登录',
            requiresAuth: false 
        }
    },
    {
        path: '/',
        component: () => import('./components/Layout.vue'),
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                redirect: '/dashboard'
            },
            {
                path: 'dashboard',
                name: 'Dashboard',
                component: () => import('./views/Dashboard.js'),
                meta: { 
                    title: '仪表板',
                    keepAlive: true 
                }
            },
            {
                path: 'subscription',
                name: 'Subscription',
                component: () => import('./views/Subscription.js'),
                meta: { 
                    title: '订阅管理',
                    keepAlive: true 
                }
            },
            {
                path: 'node',
                name: 'Node',
                component: () => import('./views/Node.js'),
                meta: { 
                    title: '节点管理',
                    requiresAdmin: true,
                    keepAlive: true 
                }
            },
            {
                path: 'user',
                name: 'User',
                component: () => import('./views/User.js'),
                meta: { 
                    title: '用户管理',
                    requiresAdmin: true,
                    keepAlive: true 
                }
            },
            {
                path: 'profile',
                name: 'Profile',
                component: () => import('./views/Profile.js'),
                meta: { 
                    title: '个人信息',
                    keepAlive: false 
                }
            }
        ]
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('./views/404.js'),
        meta: { 
            title: '页面不存在',
            requiresAuth: false 
        }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
    // 设置页面标题
    document.title = to.meta.title ? \`\${to.meta.title} - NodeConfig\` : 'NodeConfig'

    // 检查是否需要登录权限
    if (to.matched.some(record => record.meta.requiresAuth)) {
        if (!store.state.token) {
            message.warning('请先登录')
            next({
                path: '/login',
                query: { redirect: to.fullPath }
            })
            return
        }

        // 检查是否需要管理员权限
        if (to.matched.some(record => record.meta.requiresAdmin)) {
            if (store.state.user?.role !== 'admin') {
                message.error('没有访问权限')
                next({ path: '/dashboard' })
                return
            }
        }
    }

    // 如果已登录且访问登录页，重定向到首页
    if (to.path === '/login' && store.state.token) {
        next({ path: '/dashboard' })
        return
    }

    next()
})

// 全局后置钩子
router.afterEach((to, from) => {
    // 页面切换后滚动到顶部
    window.scrollTo(0, 0)
})

export default router 