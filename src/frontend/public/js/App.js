export default {
    template: `
        <a-layout class="layout">
            <a-layout-header class="header" v-if="isLoggedIn">
                <div class="logo">NodeConfig</div>
                <a-menu
                    v-model:selectedKeys="selectedKeys"
                    mode="horizontal"
                    :style="{ lineHeight: '64px', flex: 1 }"
                >
                    <a-menu-item key="dashboard" @click="$router.push('/dashboard')">
                        仪表盘
                    </a-menu-item>
                    <a-menu-item key="subscriptions" @click="$router.push('/subscriptions')">
                        我的订阅
                    </a-menu-item>
                    <a-menu-item key="nodes" @click="$router.push('/nodes')" v-if="isAdmin">
                        节点管理
                    </a-menu-item>
                    <a-menu-item key="users" @click="$router.push('/users')" v-if="isAdmin">
                        用户管理
                    </a-menu-item>
                </a-menu>
                <div style="margin-left: auto">
                    <a-dropdown>
                        <a class="ant-dropdown-link" @click.prevent>
                            {{ username }}
                            <down-outlined />
                        </a>
                        <template #overlay>
                            <a-menu>
                                <a-menu-item key="profile" @click="$router.push('/profile')">
                                    个人信息
                                </a-menu-item>
                                <a-menu-item key="logout" @click="handleLogout">
                                    退出登录
                                </a-menu-item>
                            </a-menu>
                        </template>
                    </a-dropdown>
                </div>
            </a-layout-header>
            
            <a-layout-content class="content">
                <router-view></router-view>
            </a-layout-content>
        </a-layout>
    `,
    
    setup() {
        const store = useStore()
        const router = useRouter()
        const route = useRoute()
        
        const selectedKeys = ref([])
        
        // 计算属性
        const isLoggedIn = computed(() => store.state.token !== null)
        const isAdmin = computed(() => store.state.user?.role === 'admin')
        const username = computed(() => store.state.user?.username || '')
        
        // 监听路由变化
        watch(
            () => route.path,
            (path) => {
                selectedKeys.value = [path.split('/')[1] || 'dashboard']
            },
            { immediate: true }
        )
        
        // 方法
        const handleLogout = async () => {
            await store.dispatch('logout')
            router.push('/login')
        }
        
        // 生命周期钩子
        onMounted(async () => {
            if (store.state.token) {
                await store.dispatch('checkAuth')
            }
        })
        
        return {
            selectedKeys,
            isLoggedIn,
            isAdmin,
            username,
            handleLogout
        }
    }
} 