import { computed, ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'

export default {
    template: `
        <a-layout class="layout-container">
            <!-- 侧边栏 -->
            <a-layout-sider
                v-model:collapsed="siderCollapsed"
                :trigger="null"
                collapsible
                class="layout-sider"
            >
                <div class="logo">
                    <img src="/logo.png" alt="logo" />
                    <h1 v-show="!siderCollapsed">NodeConfig</h1>
                </div>
                
                <a-menu
                    v-model:selectedKeys="selectedKeys"
                    theme="dark"
                    mode="inline"
                >
                    <a-menu-item key="dashboard" @click="navigate('/dashboard')">
                        <template #icon><dashboard-outlined /></template>
                        <span>仪表板</span>
                    </a-menu-item>

                    <a-menu-item key="subscription" @click="navigate('/subscription')">
                        <template #icon><profile-outlined /></template>
                        <span>订阅管理</span>
                    </a-menu-item>

                    <a-menu-item v-if="isAdmin" key="node" @click="navigate('/node')">
                        <template #icon><cloud-server-outlined /></template>
                        <span>节点管理</span>
                    </a-menu-item>

                    <a-menu-item v-if="isAdmin" key="user" @click="navigate('/user')">
                        <template #icon><team-outlined /></template>
                        <span>用户管理</span>
                    </a-menu-item>
                </a-menu>
            </a-layout-sider>

            <a-layout>
                <!-- 顶部导航 -->
                <a-layout-header class="layout-header">
                    <menu-unfold-outlined
                        v-if="siderCollapsed"
                        class="trigger"
                        @click="toggleSider"
                    />
                    <menu-fold-outlined
                        v-else
                        class="trigger"
                        @click="toggleSider"
                    />

                    <div class="header-right">
                        <a-space>
                            <!-- 主题切换 -->
                            <a-tooltip title="切换主题">
                                <a-button type="link" @click="toggleTheme">
                                    <template #icon>
                                        <bulb-outlined v-if="!isDarkMode" />
                                        <bulb-filled v-else />
                                    </template>
                                </a-button>
                            </a-tooltip>

                            <!-- 用户菜单 -->
                            <a-dropdown>
                                <a class="user-dropdown" @click.prevent>
                                    <a-avatar :src="userInfo.avatar">
                                        {{ userInfo.username?.charAt(0).toUpperCase() }}
                                    </a-avatar>
                                    <span class="username">{{ userInfo.username }}</span>
                                </a>
                                <template #overlay>
                                    <a-menu>
                                        <a-menu-item key="profile" @click="navigate('/profile')">
                                            <user-outlined />
                                            个人信息
                                        </a-menu-item>
                                        <a-menu-divider />
                                        <a-menu-item key="logout" @click="handleLogout">
                                            <logout-outlined />
                                            退出登录
                                        </a-menu-item>
                                    </a-menu>
                                </template>
                            </a-dropdown>
                        </a-space>
                    </div>
                </a-layout-header>

                <!-- 内容区域 -->
                <a-layout-content class="layout-content">
                    <router-view v-slot="{ Component }">
                        <keep-alive :include="cachedViews">
                            <component :is="Component" />
                        </keep-alive>
                    </router-view>
                </a-layout-content>
            </a-layout>
        </a-layout>
    `,

    setup() {
        const store = useStore()
        const router = useRouter()

        // 侧边栏状态
        const siderCollapsed = computed({
            get: () => store.state.siderCollapsed,
            set: (value) => store.commit('TOGGLE_SIDER')
        })

        // 选中的菜单项
        const selectedKeys = ref([router.currentRoute.value.name.toLowerCase()])

        // 计算属性
        const isAdmin = computed(() => store.getters.isAdmin)
        const userInfo = computed(() => store.getters.userInfo)
        const isDarkMode = computed(() => store.state.theme.darkMode)

        // 需要缓存的页面
        const cachedViews = computed(() => {
            return router.getRoutes()
                .filter(route => route.meta?.keepAlive)
                .map(route => route.name)
        })

        // 切换侧边栏
        const toggleSider = () => {
            store.commit('TOGGLE_SIDER')
        }

        // 切换主题
        const toggleTheme = () => {
            store.dispatch('toggleTheme')
        }

        // 页面导航
        const navigate = (path) => {
            router.push(path)
        }

        // 退出登录
        const handleLogout = async () => {
            await store.dispatch('logout')
            router.push('/login')
        }

        return {
            siderCollapsed,
            selectedKeys,
            isAdmin,
            userInfo,
            isDarkMode,
            cachedViews,
            toggleSider,
            toggleTheme,
            navigate,
            handleLogout
        }
    }
}

// 添加样式
const style = document.createElement('style')
style.textContent = \`
.layout-container {
    min-height: 100vh;
}

.layout-sider {
    box-shadow: 2px 0 8px 0 rgba(29, 35, 41, 0.05);
}

.logo {
    height: 64px;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo img {
    height: 32px;
    margin-right: 8px;
}

.logo h1 {
    color: white;
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}

.layout-header {
    background: #fff;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.trigger {
    font-size: 18px;
    cursor: pointer;
    transition: color 0.3s;
}

.trigger:hover {
    color: #1890ff;
}

.header-right {
    display: flex;
    align-items: center;
}

.user-dropdown {
    display: flex;
    align-items: center;
    padding: 0 12px;
    cursor: pointer;
    transition: all 0.3s;
}

.user-dropdown:hover {
    background: rgba(0, 0, 0, 0.025);
}

.username {
    margin-left: 8px;
    color: rgba(0, 0, 0, 0.85);
}

.layout-content {
    margin: 24px;
    padding: 24px;
    background: #fff;
    min-height: 280px;
}
\`
document.head.appendChild(style) 