import { createStore } from 'vuex'
import api from '../utils/request'

// 从localStorage获取持久化数据
const getPersistedState = () => {
    try {
        const token = localStorage.getItem('token')
        const user = JSON.parse(localStorage.getItem('user'))
        return {
            token,
            user
        }
    } catch (error) {
        return {
            token: null,
            user: null
        }
    }
}

const store = createStore({
    state: {
        // 合并持久化的状态
        ...getPersistedState(),
        // 全局loading状态
        loading: false,
        // 侧边栏折叠状态
        siderCollapsed: false,
        // 主题设置
        theme: {
            primaryColor: '#1890ff',
            darkMode: false
        }
    },

    mutations: {
        SET_TOKEN(state, token) {
            state.token = token
            localStorage.setItem('token', token)
        },

        SET_USER(state, user) {
            state.user = user
            localStorage.setItem('user', JSON.stringify(user))
        },

        CLEAR_AUTH(state) {
            state.token = null
            state.user = null
            localStorage.removeItem('token')
            localStorage.removeItem('user')
        },

        SET_LOADING(state, loading) {
            state.loading = loading
        },

        TOGGLE_SIDER(state) {
            state.siderCollapsed = !state.siderCollapsed
        },

        UPDATE_THEME(state, theme) {
            state.theme = { ...state.theme, ...theme }
            localStorage.setItem('theme', JSON.stringify(state.theme))
        }
    },

    actions: {
        // 登录
        async login({ commit }, credentials) {
            try {
                const res = await api.auth.login(credentials)
                commit('SET_TOKEN', res.data.token)
                commit('SET_USER', res.data.user)
                return true
            } catch (error) {
                return false
            }
        },

        // 登出
        async logout({ commit }) {
            try {
                await api.auth.logout()
            } finally {
                commit('CLEAR_AUTH')
            }
        },

        // 获取用户信息
        async getUserInfo({ commit }) {
            try {
                const res = await api.user.getProfile()
                commit('SET_USER', res.data)
                return true
            } catch (error) {
                commit('CLEAR_AUTH')
                return false
            }
        },

        // 更新用户信息
        async updateUserInfo({ commit }, data) {
            const res = await api.user.updateProfile(data)
            commit('SET_USER', res.data)
        },

        // 切换主题
        toggleTheme({ commit, state }) {
            commit('UPDATE_THEME', {
                darkMode: !state.theme.darkMode
            })
        }
    },

    getters: {
        // 是否已登录
        isLoggedIn: state => !!state.token,
        
        // 是否是管理员
        isAdmin: state => state.user?.role === 'admin',
        
        // 获取用户信息
        userInfo: state => state.user || {},
        
        // 获取主题设置
        theme: state => state.theme
    }
})

export default store 