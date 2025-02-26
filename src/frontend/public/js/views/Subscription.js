import { ref, onMounted, computed } from 'vue'
import { useStore } from 'vuex'
import { request } from '../utils/request.js'

export default {
    template: `
        <div class="subscription-page">
            <!-- 页面标题 -->
            <div class="page-header">
                <a-page-header
                    title="订阅管理"
                    :ghost="false"
                >
                    <template #extra>
                        <a-space>
                            <a-button @click="showTemplateModal" v-if="isAdmin">
                                <save-outlined />
                                订阅模板
                            </a-button>
                            <a-button type="primary" @click="showCreateModal">
                                <plus-outlined />
                                创建订阅
                            </a-button>
                        </a-space>
                    </template>
                </a-page-header>
            </div>

            <!-- 搜索和筛选 -->
            <a-card style="margin-top: 16px">
                <a-form layout="inline">
                    <a-form-item label="订阅名称">
                        <a-input
                            v-model:value="searchForm.name"
                            placeholder="搜索订阅名称"
                            allowClear
                            @change="handleSearch"
                        />
                    </a-form-item>
                    <a-form-item label="状态">
                        <a-select
                            v-model:value="searchForm.status"
                            style="width: 120px"
                            allowClear
                            @change="handleSearch"
                        >
                            <a-select-option value="active">活跃</a-select-option>
                            <a-select-option value="inactive">停用</a-select-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item label="用户" v-if="isAdmin">
                        <a-select
                            v-model:value="searchForm.userId"
                            style="width: 200px"
                            allowClear
                            placeholder="选择用户"
                            @change="handleSearch"
                            show-search
                            :filter-option="filterUser"
                        >
                            <a-select-option v-for="user in users" :key="user.id" :value="user.id">
                                {{ user.username }}
                            </a-select-option>
                        </a-select>
                    </a-form-item>
                </a-form>
            </a-card>

            <!-- 订阅列表 -->
            <a-card style="margin-top: 16px">
                <a-table
                    :columns="columns"
                    :data-source="subscriptions"
                    :loading="loading"
                    :pagination="{
                        total: total,
                        current: currentPage,
                        pageSize: pageSize,
                        onChange: handlePageChange
                    }"
                >
                    <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'status'">
                            <a-tag :color="record.status === 'active' ? 'success' : 'error'">
                                {{ record.status === 'active' ? '活跃' : '停用' }}
                            </a-tag>
                        </template>
                        <template v-if="column.key === 'action'">
                            <a-space>
                                <a @click="showDetailModal(record)">详情</a>
                                <a @click="showEditModal(record)">编辑</a>
                                <a @click="copySubscriptionUrl(record)">复制链接</a>
                                <a @click="downloadConfig(record)">下载配置</a>
                                <a-popconfirm
                                    title="确定要删除这个订阅吗？"
                                    @confirm="handleDelete(record)"
                                >
                                    <a class="danger-link">删除</a>
                                </a-popconfirm>
                            </a-space>
                        </template>
                    </template>
                </a-table>
            </a-card>

            <!-- 创建/编辑订阅对话框 -->
            <a-modal
                v-model:visible="modalVisible"
                :title="modalMode === 'create' ? '创建订阅' : '编辑订阅'"
                @ok="handleModalOk"
                :confirmLoading="modalLoading"
                width="800px"
            >
                <a-form
                    ref="formRef"
                    :model="formState"
                    :rules="rules"
                    layout="vertical"
                >
                    <a-row :gutter="16">
                        <a-col :span="12">
                            <a-form-item label="订阅名称" name="name">
                                <a-input v-model:value="formState.name" placeholder="请输入订阅名称" />
                            </a-form-item>
                        </a-col>
                        <a-col :span="12">
                            <a-form-item label="用户" name="userId" v-if="isAdmin">
                                <a-select
                                    v-model:value="formState.userId"
                                    placeholder="选择用户"
                                    show-search
                                    :filter-option="filterUser"
                                >
                                    <a-select-option v-for="user in users" :key="user.id" :value="user.id">
                                        {{ user.username }}
                                    </a-select-option>
                                </a-select>
                            </a-form-item>
                        </a-col>
                    </a-row>

                    <a-form-item label="订阅模板" name="templateId">
                        <a-select
                            v-model:value="formState.templateId"
                            placeholder="选择订阅模板"
                            @change="handleTemplateChange"
                            allowClear
                        >
                            <a-select-option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">
                                {{ tpl.name }}
                            </a-select-option>
                        </a-select>
                    </a-form-item>

                    <a-form-item label="节点选择" name="nodes">
                        <a-transfer
                            v-model:targetKeys="formState.nodes"
                            :dataSource="availableNodes"
                            :titles="['可用节点', '已选节点']"
                            :render="item => item.title"
                            :showSearch="true"
                            :filterOption="filterNode"
                        />
                    </a-form-item>

                    <a-row :gutter="16">
                        <a-col :span="12">
                            <a-form-item label="到期时间" name="expire_at">
                                <a-date-picker
                                    v-model:value="formState.expire_at"
                                    style="width: 100%"
                                    showTime
                                    :disabledDate="disabledDate"
                                />
                            </a-form-item>
                        </a-col>
                        <a-col :span="12">
                            <a-form-item label="流量限制" name="bandwidth_limit">
                                <a-input-number
                                    v-model:value="formState.bandwidth_limit"
                                    :min="0"
                                    :step="1024"
                                    style="width: 200px"
                                >
                                    <template #addonAfter>MB</template>
                                </a-input-number>
                            </a-form-item>
                        </a-col>
                    </a-row>

                    <a-form-item label="备注" name="remark">
                        <a-textarea
                            v-model:value="formState.remark"
                            :rows="2"
                            placeholder="请输入备注信息"
                        />
                    </a-form-item>
                </a-form>
            </a-modal>

            <!-- 订阅详情对话框 -->
            <a-modal
                v-model:visible="detailVisible"
                title="订阅详情"
                :footer="null"
                width="800px"
            >
                <a-descriptions bordered>
                    <a-descriptions-item label="订阅名称" span="2">
                        {{ currentSubscription?.name }}
                    </a-descriptions-item>
                    <a-descriptions-item label="状态" span="1">
                        <a-tag :color="currentSubscription?.status === 'active' ? 'success' : 'error'">
                            {{ currentSubscription?.status === 'active' ? '活跃' : '停用' }}
                        </a-tag>
                    </a-descriptions-item>
                    <a-descriptions-item label="用户" span="1">
                        {{ currentSubscription?.user?.username }}
                    </a-descriptions-item>
                    <a-descriptions-item label="创建时间" span="1">
                        {{ formatDate(currentSubscription?.created_at) }}
                    </a-descriptions-item>
                    <a-descriptions-item label="到期时间" span="1">
                        {{ formatDate(currentSubscription?.expire_at) }}
                    </a-descriptions-item>
                    <a-descriptions-item label="订阅链接" span="3">
                        <a-input-group compact>
                            <a-input
                                :value="getSubscriptionUrl(currentSubscription)"
                                style="width: calc(100% - 100px)"
                                readonly
                            />
                            <a-button type="primary" @click="copySubscriptionUrl(currentSubscription)">
                                复制链接
                            </a-button>
                        </a-input-group>
                    </a-descriptions-item>
                    <a-descriptions-item label="流量使用" span="3">
                        <a-progress
                            :percent="getBandwidthPercent(currentSubscription)"
                            :status="getBandwidthStatus(currentSubscription)"
                            :format="percent => \`\${formatBandwidth(currentSubscription?.bandwidth)} / \${formatBandwidth(currentSubscription?.bandwidth_limit)}\`"
                        />
                    </a-descriptions-item>
                    <a-descriptions-item label="备注" span="3">
                        {{ currentSubscription?.remark || '无' }}
                    </a-descriptions-item>
                </a-descriptions>

                <a-divider>节点列表</a-divider>
                
                <a-table
                    :columns="nodeColumns"
                    :data-source="currentSubscription?.nodes"
                    :pagination="false"
                    size="small"
                >
                    <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'status'">
                            <a-tag :color="record.status === 'active' ? 'success' : 'error'">
                                {{ record.status === 'active' ? '正常' : '异常' }}
                            </a-tag>
                        </template>
                        <template v-if="column.key === 'latency'">
                            <span :style="{ color: getLatencyColor(record.latency) }">
                                {{ record.latency ? \`\${record.latency}ms\` : '未测试' }}
                            </span>
                        </template>
                    </template>
                </a-table>
            </a-modal>

            <!-- 订阅模板对话框 -->
            <a-modal
                v-model:visible="templateModalVisible"
                title="订阅模板管理"
                @ok="handleTemplateModalOk"
                :confirmLoading="templateModalLoading"
                width="800px"
            >
                <a-table
                    :columns="templateColumns"
                    :data-source="templates"
                    :pagination="false"
                >
                    <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'action'">
                            <a-space>
                                <a @click="editTemplate(record)">编辑</a>
                                <a-popconfirm
                                    title="确定要删除这个模板吗？"
                                    @confirm="deleteTemplate(record)"
                                >
                                    <a class="danger-link">删除</a>
                                </a-popconfirm>
                            </a-space>
                        </template>
                    </template>
                </a-table>

                <a-divider />

                <a-form
                    ref="templateFormRef"
                    :model="templateForm"
                    :rules="templateRules"
                    layout="vertical"
                >
                    <a-form-item label="模板名称" name="name">
                        <a-input v-model:value="templateForm.name" placeholder="请输入模板名称" />
                    </a-form-item>
                    <a-form-item label="配置内容" name="config">
                        <a-textarea
                            v-model:value="templateForm.config"
                            :rows="6"
                            placeholder="请输入配置内容"
                        />
                    </a-form-item>
                </a-form>
            </a-modal>
        </div>
    `,

    setup() {
        const store = useStore()
        const isAdmin = computed(() => store.state.user?.role === 'admin')
        
        // 表格相关
        const loading = ref(false)
        const currentPage = ref(1)
        const pageSize = ref(10)
        const total = ref(0)
        const subscriptions = ref([])
        
        const columns = [
            { title: '订阅名称', dataIndex: 'name', key: 'name' },
            { title: '用户', dataIndex: ['user', 'username'], key: 'username', visible: isAdmin.value },
            { title: '状态', dataIndex: 'status', key: 'status' },
            { title: '节点数量', dataIndex: 'nodeCount', key: 'nodeCount' },
            { title: '到期时间', dataIndex: 'expire_at', key: 'expire_at' },
            { title: '操作', key: 'action', width: 280 }
        ].filter(col => col.visible !== false)

        const nodeColumns = [
            { title: '节点名称', dataIndex: 'name', key: 'name' },
            { title: '类型', dataIndex: 'type', key: 'type' },
            { title: '状态', dataIndex: 'status', key: 'status' },
            { title: '延迟', dataIndex: 'latency', key: 'latency' },
            { title: '国家/地区', dataIndex: 'country', key: 'country' }
        ]

        // 搜索表单
        const searchForm = ref({
            name: '',
            status: undefined,
            userId: undefined
        })

        // 表单相关
        const formRef = ref(null)
        const modalVisible = ref(false)
        const modalMode = ref('create')
        const modalLoading = ref(false)
        const formState = ref({
            name: '',
            userId: '',
            templateId: undefined,
            nodes: [],
            expire_at: null,
            bandwidth_limit: null,
            remark: ''
        })

        const rules = {
            name: [{ required: true, message: '请输入订阅名称' }],
            userId: [{ required: true, message: '请选择用户' }],
            nodes: [{ required: true, type: 'array', min: 1, message: '请选择至少一个节点' }]
        }

        // 详情对话框
        const detailVisible = ref(false)
        const currentSubscription = ref(null)

        // 模板相关
        const templateModalVisible = ref(false)
        const templateModalLoading = ref(false)
        const templates = ref([])
        const templateColumns = [
            { title: '模板名称', dataIndex: 'name', key: 'name' },
            { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
            { title: '操作', key: 'action', width: 150 }
        ]

        const templateFormRef = ref(null)
        const templateForm = ref({
            id: null,
            name: '',
            config: ''
        })

        const templateRules = {
            name: [{ required: true, message: '请输入模板名称' }],
            config: [{ required: true, message: '请输入配置内容' }]
        }

        // 可用节点
        const availableNodes = ref([])
        const users = ref([])

        // 获取订阅列表
        const fetchSubscriptions = async () => {
            loading.value = true
            try {
                const response = await request.subscription.getList({
                    page: currentPage.value,
                    pageSize: pageSize.value,
                    ...searchForm.value
                })
                subscriptions.value = response.data.subscriptions
                total.value = response.data.total
            } catch (error) {
                antd.message.error('获取订阅列表失败')
            } finally {
                loading.value = false
            }
        }

        // 获取可用节点
        const fetchAvailableNodes = async () => {
            try {
                const response = await request.node.getList({ status: 'active' })
                availableNodes.value = response.data.nodes.map(node => ({
                    key: node.id,
                    title: node.name,
                    description: node.remark,
                    ...node
                }))
            } catch (error) {
                antd.message.error('获取节点列表失败')
            }
        }

        // 获取用户列表
        const fetchUsers = async () => {
            if (!isAdmin.value) return
            try {
                const response = await request.user.getList()
                users.value = response.data.users
            } catch (error) {
                antd.message.error('获取用户列表失败')
            }
        }

        // 获取模板列表
        const fetchTemplates = async () => {
            try {
                const response = await request.subscription.getTemplates()
                templates.value = response.data
            } catch (error) {
                antd.message.error('获取模板列表失败')
            }
        }

        // 显示创建对话框
        const showCreateModal = () => {
            modalMode.value = 'create'
            formState.value = {
                name: '',
                userId: store.state.user.id,
                templateId: undefined,
                nodes: [],
                expire_at: null,
                bandwidth_limit: null,
                remark: ''
            }
            fetchAvailableNodes()
            modalVisible.value = true
        }

        // 显示编辑对话框
        const showEditModal = (record) => {
            modalMode.value = 'edit'
            formState.value = {
                ...record,
                nodes: record.nodes.map(node => node.id),
                expire_at: record.expire_at ? moment(record.expire_at) : null
            }
            fetchAvailableNodes()
            modalVisible.value = true
        }

        // 显示详情对话框
        const showDetailModal = async (record) => {
            try {
                const response = await request.subscription.getDetail(record.id)
                currentSubscription.value = response.data
                detailVisible.value = true
            } catch (error) {
                antd.message.error('获取订阅详情失败')
            }
        }

        // 处理表单提交
        const handleModalOk = async () => {
            try {
                await formRef.value.validate()
                modalLoading.value = true

                const data = {
                    ...formState.value,
                    expire_at: formState.value.expire_at?.format('YYYY-MM-DD HH:mm:ss')
                }

                if (modalMode.value === 'create') {
                    await request.subscription.create(data)
                    antd.message.success('创建成功')
                } else {
                    await request.subscription.update(currentSubscription.value.id, data)
                    antd.message.success('更新成功')
                }

                modalVisible.value = false
                fetchSubscriptions()
            } catch (error) {
                antd.message.error(modalMode.value === 'create' ? '创建失败' : '更新失败')
            } finally {
                modalLoading.value = false
            }
        }

        // 处理删除
        const handleDelete = async (record) => {
            try {
                await request.subscription.delete(record.id)
                antd.message.success('删除成功')
                fetchSubscriptions()
            } catch (error) {
                antd.message.error('删除失败')
            }
        }

        // 复制订阅链接
        const copySubscriptionUrl = (subscription) => {
            const url = getSubscriptionUrl(subscription)
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

        // 处理模板选择
        const handleTemplateChange = async (templateId) => {
            if (!templateId) return
            try {
                const response = await request.subscription.getTemplate(templateId)
                formState.value = {
                    ...formState.value,
                    ...response.data
                }
            } catch (error) {
                antd.message.error('获取模板配置失败')
            }
        }

        // 编辑模板
        const editTemplate = (template) => {
            templateForm.value = { ...template }
        }

        // 删除模板
        const deleteTemplate = async (template) => {
            try {
                await request.subscription.deleteTemplate(template.id)
                antd.message.success('删除模板成功')
                fetchTemplates()
            } catch (error) {
                antd.message.error('删除模板失败')
            }
        }

        // 处理模板表单提交
        const handleTemplateModalOk = async () => {
            try {
                await templateFormRef.value.validate()
                templateModalLoading.value = true

                if (templateForm.value.id) {
                    await request.subscription.updateTemplate(templateForm.value.id, templateForm.value)
                    antd.message.success('更新模板成功')
                } else {
                    await request.subscription.createTemplate(templateForm.value)
                    antd.message.success('创建模板成功')
                }

                templateForm.value = { id: null, name: '', config: '' }
                fetchTemplates()
            } catch (error) {
                antd.message.error('保存模板失败')
            } finally {
                templateModalLoading.value = false
            }
        }

        // 处理搜索
        const handleSearch = () => {
            currentPage.value = 1
            fetchSubscriptions()
        }

        // 处理分页
        const handlePageChange = (page) => {
            currentPage.value = page
            fetchSubscriptions()
        }

        // 获取订阅链接
        const getSubscriptionUrl = (subscription) => {
            if (!subscription) return ''
            return \`\${window.location.origin}/api/subscription/\${subscription.token}\`
        }

        // 获取带宽使用百分比
        const getBandwidthPercent = (subscription) => {
            if (!subscription?.bandwidth_limit) return 0
            return Math.round((subscription.bandwidth / subscription.bandwidth_limit) * 100)
        }

        // 获取带宽状态
        const getBandwidthStatus = (subscription) => {
            if (!subscription?.bandwidth_limit) return 'normal'
            const percent = getBandwidthPercent(subscription)
            if (percent >= 100) return 'exception'
            if (percent >= 80) return 'warning'
            return 'normal'
        }

        // 格式化带宽
        const formatBandwidth = (bytes) => {
            if (!bytes) return '0 B'
            const units = ['B', 'KB', 'MB', 'GB', 'TB']
            let num = bytes
            let unitIndex = 0
            while (num >= 1024 && unitIndex < units.length - 1) {
                num /= 1024
                unitIndex++
            }
            return \`\${num.toFixed(2)} \${units[unitIndex]}\`
        }

        // 过滤用户选项
        const filterUser = (input, option) => {
            return option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
        }

        // 过滤节点选项
        const filterNode = (inputValue, item) => {
            return item.title.toLowerCase().indexOf(inputValue.toLowerCase()) >= 0
        }

        // 禁用过去的日期
        const disabledDate = (current) => {
            return current && current < moment().startOf('day')
        }

        // 格式化日期
        const formatDate = (date) => {
            if (!date) return '永久有效'
            return moment(date).format('YYYY-MM-DD HH:mm:ss')
        }

        // 获取延迟颜色
        const getLatencyColor = (latency) => {
            if (!latency) return '#999'
            if (latency < 100) return '#52c41a'
            if (latency < 200) return '#faad14'
            return '#f5222d'
        }

        onMounted(() => {
            fetchSubscriptions()
            fetchTemplates()
            if (isAdmin.value) {
                fetchUsers()
            }
        })

        return {
            isAdmin,
            loading,
            currentPage,
            pageSize,
            total,
            subscriptions,
            columns,
            nodeColumns,
            searchForm,
            formRef,
            modalVisible,
            modalMode,
            modalLoading,
            formState,
            rules,
            detailVisible,
            currentSubscription,
            templateModalVisible,
            templateModalLoading,
            templates,
            templateColumns,
            templateFormRef,
            templateForm,
            templateRules,
            availableNodes,
            users,
            showCreateModal,
            showEditModal,
            showDetailModal,
            handleModalOk,
            handleDelete,
            copySubscriptionUrl,
            downloadConfig,
            handleTemplateChange,
            editTemplate,
            deleteTemplate,
            handleTemplateModalOk,
            handleSearch,
            handlePageChange,
            getSubscriptionUrl,
            getBandwidthPercent,
            getBandwidthStatus,
            formatBandwidth,
            filterUser,
            filterNode,
            disabledDate,
            formatDate,
            getLatencyColor
        }
    }
} 