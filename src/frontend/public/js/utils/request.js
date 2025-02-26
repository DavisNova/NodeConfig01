import axios from 'axios'
import { message } from 'ant-design-vue'
import store from '../store'
import router from '../router'

// 创建axios实例
const request = axios.create({
    baseURL: '/api',
    timeout: 10000
})

// 请求拦截器
request.interceptors.request.use(
    config => {
        // 从store获取token
        const token = store.state.token
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`
        }
        return config
    },
    error => {
        console.error('请求错误:', error)
        return Promise.reject(error)
    }
)

// 响应拦截器
request.interceptors.response.use(
    response => {
        const res = response.data
        // 如果返回的状态码不是200，说明接口有问题，应该提示错误
        if (response.status !== 200) {
            message.error(res.message || '系统错误')
            return Promise.reject(new Error(res.message || '系统错误'))
        }
        return res
    },
    error => {
        console.error('响应错误:', error)
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    // token过期或未登录
                    store.dispatch('logout')
                    router.push('/login')
                    break
                case 403:
                    message.error('没有权限访问')
                    break
                case 404:
                    message.error('请求的资源不存在')
                    break
                case 500:
                    message.error('服务器错误')
                    break
                default:
                    message.error(error.response.data.message || '系统错误')
            }
        } else {
            message.error('网络错误，请检查网络连接')
        }
        return Promise.reject(error)
    }
)

// API请求模块
const api = {
    auth: {
        login: data => request.post('/auth/login', data),
        register: data => request.post('/auth/register', data),
        logout: () => request.post('/auth/logout')
    },
    user: {
        getProfile: () => request.get('/user/profile'),
        updateProfile: data => request.put('/user/profile', data),
        changePassword: data => request.put('/user/password', data),
        getList: params => request.get('/user/list', { params }),
        create: data => request.post('/user', data),
        update: (id, data) => request.put(`/user/${id}`, data),
        delete: id => request.delete(`/user/${id}`),
        toggleStatus: id => request.put(`/user/${id}/toggle-status`),
        sendEmailCode: email => request.post('/user/send-email-code', { email }),
        updateEmail: data => request.put('/user/email', data)
    },
    node: {
        getList: params => request.get('/node/list', { params }),
        getDetail: id => request.get(`/node/${id}`),
        create: data => request.post('/node', data),
        update: (id, data) => request.put(`/node/${id}`, data),
        delete: id => request.delete(`/node/${id}`),
        check: id => request.post(`/node/${id}/check`),
        batchCheck: () => request.post('/node/batch-check')
    },
    subscription: {
        getList: params => request.get('/subscription/list', { params }),
        getDetail: id => request.get(`/subscription/${id}`),
        create: data => request.post('/subscription', data),
        update: (id, data) => request.put(`/subscription/${id}`, data),
        delete: id => request.delete(`/subscription/${id}`),
        generateConfig: id => request.get(`/subscription/${id}/config`)
    }
}

export default api 