import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createStore } from 'vuex'
import App from './App.js'
import routes from './routes.js'
import store from './store.js'
import { setupAxios } from './utils/request.js'

// 创建路由实例
const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')
    if (to.matched.some(record => record.meta.requiresAuth)) {
        if (!token) {
            next({
                path: '/login',
                query: { redirect: to.fullPath }
            })
        } else {
            next()
        }
    } else {
        next()
    }
})

// 创建 Vuex store 实例
const store = createStore({
    state() {
        return {
            user: null,
            token: localStorage.getItem('token')
        }
    },
    mutations: {
        setUser(state, user) {
            state.user = user
        },
        setToken(state, token) {
            state.token = token
            localStorage.setItem('token', token)
        },
        clearAuth(state) {
            state.user = null
            state.token = null
            localStorage.removeItem('token')
        }
    },
    actions: {
        async login({ commit }, credentials) {
            try {
                const response = await axios.post('/api/users/login', credentials)
                const { token, user } = response.data
                commit('setToken', token)
                commit('setUser', user)
                return true
            } catch (error) {
                console.error('登录失败:', error)
                return false
            }
        },
        async logout({ commit }) {
            commit('clearAuth')
        },
        async checkAuth({ commit, state }) {
            if (!state.token) return false
            try {
                const response = await axios.get('/api/users/profile')
                commit('setUser', response.data.user)
                return true
            } catch (error) {
                commit('clearAuth')
                return false
            }
        }
    }
})

// 设置 axios
setupAxios(store, router)

// 创建应用实例
const app = createApp(App)

// 注册全局组件
app.use(antd)
app.use(router)
app.use(store)

// 挂载应用
app.mount('#app') 