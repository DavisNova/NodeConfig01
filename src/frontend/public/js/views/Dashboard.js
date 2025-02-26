import { ref, onMounted, computed } from 'vue'
import { useStore } from 'vuex'
import { request } from '../utils/request.js'
import moment from 'moment'

export default {
    template: `
        <div class="dashboard">
            <!-- 用户信息卡片 -->
            <a-card style="margin-bottom: 16px">
                <template #title>
                    <span>
                        <user-outlined />
                        欢迎回来，{{ userInfo.username }}
                    </span>
                </template>
                <a-descriptions>
                    <a-descriptions-item label="角色">
                        {{ userInfo.role === 'admin' ? '管理员' : '普通用户' }}
                    </a-descriptions-item>
                    <a-descriptions-item label="邮箱">
                        {{ userInfo.email || '未设置' }}
                    </a-descriptions-item>
                    <a-descriptions-item label="注册时间">
                        {{ formatDate(userInfo.created_at) }}
                    </a-descriptions-item>
                </a-descriptions>
            </a-card>

            <!-- 统计卡片 -->
            <a-row :gutter="16">
                <a-col :span="8">
                    <a-card>
                        <template #title>
                            <span>
                                <profile-outlined />
                                我的订阅
                            </span>
                        </template>
                        <a-statistic
                            :value="statistics.activeSubscriptions"
                            :valueStyle="{ color: '#3f8600' }"
                        >
                            <template #suffix>个活跃订阅</template>
                        </a-statistic>
                    </a-card>
                </a-col>
                <a-col :span="8">
                    <a-card>
                        <template #title>
                            <span>
                                <cluster-outlined />
                                可用节点
                            </span>
                        </template>
                        <a-statistic
                            :value="statistics.availableNodes"
                        >
                            <template #suffix>个节点</template>
                        </a-statistic>
                    </a-card>
                </a-col>
                <a-col :span="8">
                    <a-card>
                        <template #title>
                            <span>
                                <warning-outlined />
                                即将过期
                            </span>
                        </template>
                        <a-statistic
                            :value="statistics.expiringNodes"
                            :valueStyle="{ color: '#cf1322' }"
                        >
                            <template #suffix>个节点</template>
                        </a-statistic>
                    </a-card>
                </a-col>
            </a-row>

            <!-- 我的订阅列表 -->
            <a-card style="margin-top: 16px">
                <template #title>
                    <span>
                        <unordered-list-outlined />
                        我的订阅
                    </span>
                </template>
                <template #extra>
                    <a-button type="primary" @click="$router.push('/subscription')">
                        管理订阅
                    </a-button>
                </template>
                <a-table
                    :columns="subscriptionColumns"
                    :data-source="subscriptions"
                    :loading="loading"
                    :pagination="{ pageSize: 5 }"
                >
                    <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'status'">
                            <a-tag :color="record.status === 'active' ? 'success' : 'error'">
                                {{ record.status === 'active' ? '活跃' : '停用' }}
                            </a-tag>
                        </template>
                        <template v-if="column.key === 'action'">
                            <a-space>
                                <a @click="viewSubscription(record)">查看</a>
                                <a @click="copySubscriptionUrl(record)">复制链接</a>
                                <a @click="downloadConfig(record)">下载配置</a>
                            </a-space>
                        </template>
                    </template>
                </a-table>
            </a-card>

            <!-- 节点状态 -->
            <a-card style="margin-top: 16px">
                <template #title>
                    <span>
                        <api-outlined />
                        节点状态
                    </span>
                </template>
                <a-table
                    :columns="nodeColumns"
                    :data-source="nodes"
                    :loading="loading"
                    :pagination="{ pageSize: 5 }"
                >
                    <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'status'">
                            <a-badge
                                :status="record.status === 'active' ? 'success' : 'error'"
                                :text="record.status === 'active' ? '正常' : '异常'"
                            />
                        </template>
                        <template v-if="column.key === 'latency'">
                            <span :style="{ color: getLatencyColor(record.latency) }">
                                {{ record.latency ? \`\${record.latency}ms\` : '未测试' }}
                            </span>
                        </template>
                    </template>
                </a-table>
            </a-card>

            <!-- 订阅详情对话框 -->
            <a-modal
                v-model:visible="detailVisible"
                title="订阅详情"
                :footer="null"
                width="800px"
            >
                <a-descriptions bordered>
                    <a-descriptions-item label="订阅名称" span="3">
                        {{ currentSubscription?.name }}
                    </a-descriptions-item>
                    <a-descriptions-item label="状态" span="1">
                        <a-tag :color="currentSubscription?.status === 'active' ? 'success' : 'error'">
                            {{ currentSubscription?.status === 'active' ? '活跃' : '停用' }}
                        </a-tag>
                    </a-descriptions-item>
                    <a-descriptions-item label="创建时间" span="1">
                        {{ formatDate(currentSubscription?.created_at) }}
                    </a-descriptions-item>
                    <a-descriptions-item label="到期时间" span="1">
                        {{ formatDate(currentSubscription?.expire_at) }}
                    </a-descriptions-item>
                </a-descriptions>

                <a-divider>包含节点</a-divider>
                
                <a-table
                    :columns="subscriptionNodeColumns"
                    :data-source="currentSubscription?.nodes"
                    :pagination="false"
                    size="small"
                >
                    <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'status'">
                            <a-badge
                                :status="record.status === 'active' ? 'success' : 'error'"
                                :text="record.status === 'active' ? '正常' : '异常'"
                            />
                        </template>
                    </template>
                </a-table>
            </a-modal>
        </div>
    `,

    setup() {
        const store = useStore()
        const userInfo = computed(() => store.state.user)
        
        // 加载状态
        const loading = ref(false)
        
        // 统计数据
        const statistics = ref({
            activeSubscriptions: 0,
            availableNodes: 0,
            expiringNodes: 0
        })

        // 订阅列表
        const subscriptions = ref([])
        const subscriptionColumns = [
            { title: '名称', dataIndex: 'name', key: 'name' },
            { title: '状态', dataIndex: 'status', key: 'status' },
            { title: '节点数量', dataIndex: 'nodeCount', key: 'nodeCount' },
            { title: '到期时间', dataIndex: 'expire_at', key: 'expire_at' },
            { title: '操作', key: 'action', width: 200 }
        ]

        // 节点列表
        const nodes = ref([])
        const nodeColumns = [
            { title: '节点名称', dataIndex: 'name', key: 'name' },
            { title: '类型', dataIndex: 'type', key: 'type' },
            { title: '状态', dataIndex: 'status', key: 'status' },
            { title: '延迟', dataIndex: 'latency', key: 'latency' },
            { title: '国家/地区', dataIndex: 'country', key: 'country' }
        ]

        // 订阅节点列表
        const subscriptionNodeColumns = [
            { title: '节点名称', dataIndex: 'name', key: 'name' },
            { title: '类型', dataIndex: 'type', key: 'type' },
            { title: '状态', dataIndex: 'status', key: 'status' },
            { title: '国家/地区', dataIndex: 'country', key: 'country' }
        ]

        // 详情对话框
        const detailVisible = ref(false)
        const currentSubscription = ref(null)

        // 获取仪表板数据
        const fetchDashboardData = async () => {
            loading.value = true
            try {
                // 获取统计数据
                const statsResponse = await request.user.getDashboardStats()
                statistics.value = statsResponse.data

                // 获取订阅列表
                const subsResponse = await request.subscription.getList({ limit: 5 })
                subscriptions.value = subsResponse.data.subscriptions

                // 获取节点列表
                const nodesResponse = await request.node.getList({ limit: 5 })
                nodes.value = nodesResponse.data.nodes
            } catch (error) {
                antd.message.error('获取数据失败')
            } finally {
                loading.value = false
            }
        }

        // 查看订阅详情
        const viewSubscription = async (subscription) => {
            try {
                const response = await request.subscription.getDetail(subscription.id)
                currentSubscription.value = response.data
                detailVisible.value = true
            } catch (error) {
                antd.message.error('获取订阅详情失败')
            }
        }

        // 复制订阅链接
        const copySubscriptionUrl = (subscription) => {
            const url = \`\${window.location.origin}/api/subscription/\${subscription.token}\`
            navigator.clipboard.writeText(url)
                .then(() => antd.message.success('订阅链接已复制'))
                .catch(() => antd.message.error('复制失败'))
        }

        // 下载配置文件
        const downloadConfig = async (subscription) => {
            try {
                const response = await request.subscription.generateConfig(subscription.id)
                const blob = new Blob([response.data], { type: 'text/yaml' })
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = \`subscription-\${subscription.id}.yaml\`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
            } catch (error) {
                antd.message.error('下载配置失败')
            }
        }

        // 获取延迟颜色
        const getLatencyColor = (latency) => {
            if (!latency) return '#999'
            if (latency < 100) return '#52c41a'
            if (latency < 200) return '#faad14'
            return '#f5222d'
        }

        // 格式化日期
        const formatDate = (date) => {
            if (!date) return '永久有效'
            return moment(date).format('YYYY-MM-DD HH:mm:ss')
        }

        onMounted(() => {
            fetchDashboardData()
        })

        return {
            userInfo,
            loading,
            statistics,
            subscriptions,
            subscriptionColumns,
            nodes,
            nodeColumns,
            subscriptionNodeColumns,
            detailVisible,
            currentSubscription,
            viewSubscription,
            copySubscriptionUrl,
            downloadConfig,
            getLatencyColor,
            formatDate
        }
    }
} 