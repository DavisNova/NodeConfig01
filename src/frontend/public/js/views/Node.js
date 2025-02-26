import { ref, onMounted, computed } from 'vue'
import { useStore } from 'vuex'
import { request } from '../utils/request.js'

export default {
    template: `
        <div class="node-page">
            <!-- 页面标题 -->
            <div class="page-header">
                <a-page-header
                    title="节点管理"
                    :ghost="false"
                >
                    <template #extra>
                        <a-space>
                            <a-button @click="handleBatchCheck">
                                <sync-outlined />
                                批量检测
                            </a-button>
                            <a-button @click="showTemplateModal">
                                <save-outlined />
                                节点模板
                            </a-button>
                            <a-button type="primary" @click="showCreateModal">
                                <plus-outlined />
                                添加节点
                            </a-button>
                        </a-space>
                    </template>
                </a-page-header>
            </div>

            <!-- 搜索和筛选 -->
            <a-card style="margin-top: 16px">
                <a-form layout="inline">
                    <a-form-item label="节点名称">
                        <a-input
                            v-model:value="searchForm.name"
                            placeholder="搜索节点名称"
                            allowClear
                            @change="handleSearch"
                        />
                    </a-form-item>
                    <a-form-item label="节点类型">
                        <a-select
                            v-model:value="searchForm.type"
                            style="width: 120px"
                            allowClear
                            @change="handleSearch"
                        >
                            <a-select-option value="vless">VLESS</a-select-option>
                            <a-select-option value="socks5">SOCKS5</a-select-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item label="状态">
                        <a-select
                            v-model:value="searchForm.status"
                            style="width: 120px"
                            allowClear
                            @change="handleSearch"
                        >
                            <a-select-option value="active">正常</a-select-option>
                            <a-select-option value="inactive">异常</a-select-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item label="国家/地区">
                        <a-select
                            v-model:value="searchForm.country"
                            style="width: 120px"
                            allowClear
                            @change="handleSearch"
                        >
                            <a-select-option value="CN">中国</a-select-option>
                            <a-select-option value="HK">香港</a-select-option>
                            <a-select-option value="TW">台湾</a-select-option>
                            <a-select-option value="JP">日本</a-select-option>
                            <a-select-option value="KR">韩国</a-select-option>
                            <a-select-option value="SG">新加坡</a-select-option>
                            <a-select-option value="US">美国</a-select-option>
                        </a-select>
                    </a-form-item>
                </a-form>
            </a-card>

            <!-- 节点列表 -->
            <a-card style="margin-top: 16px">
                <a-table
                    :columns="columns"
                    :data-source="nodes"
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
                                {{ record.status === 'active' ? '正常' : '异常' }}
                            </a-tag>
                        </template>
                        <template v-if="column.key === 'latency'">
                            <span :style="{ color: getLatencyColor(record.latency) }">
                                {{ record.latency ? \`\${record.latency}ms\` : '未测试' }}
                            </span>
                        </template>
                        <template v-if="column.key === 'action'">
                            <a-space>
                                <a @click="showDetailModal(record)">详情</a>
                                <a @click="showEditModal(record)">编辑</a>
                                <a @click="handleCheck(record)">检测</a>
                                <a @click="saveAsTemplate(record)">存为模板</a>
                                <a-popconfirm
                                    title="确定要删除这个节点吗？"
                                    @confirm="handleDelete(record)"
                                >
                                    <a class="danger-link">删除</a>
                                </a-popconfirm>
                            </a-space>
                        </template>
                    </template>
                </a-table>
            </a-card>

            <!-- 创建/编辑节点对话框 -->
            <a-modal
                v-model:visible="modalVisible"
                :title="modalMode === 'create' ? '添加节点' : '编辑节点'"
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
                            <a-form-item label="节点名称" name="name">
                                <a-input v-model:value="formState.name" placeholder="请输入节点名称" />
                            </a-form-item>
                        </a-col>
                        <a-col :span="12">
                            <a-form-item label="节点类型" name="type">
                                <a-select v-model:value="formState.type">
                                    <a-select-option value="vless">VLESS</a-select-option>
                                    <a-select-option value="socks5">SOCKS5</a-select-option>
                                </a-select>
                            </a-form-item>
                        </a-col>
                    </a-row>

                    <a-row :gutter="16">
                        <a-col :span="12">
                            <a-form-item label="国家/地区" name="country">
                                <a-select v-model:value="formState.country">
                                    <a-select-option value="CN">中国</a-select-option>
                                    <a-select-option value="HK">香港</a-select-option>
                                    <a-select-option value="TW">台湾</a-select-option>
                                    <a-select-option value="JP">日本</a-select-option>
                                    <a-select-option value="KR">韩国</a-select-option>
                                    <a-select-option value="SG">新加坡</a-select-option>
                                    <a-select-option value="US">美国</a-select-option>
                                </a-select>
                            </a-form-item>
                        </a-col>
                        <a-col :span="12">
                            <a-form-item label="城市" name="city">
                                <a-input v-model:value="formState.city" placeholder="请输入城市" />
                            </a-form-item>
                        </a-col>
                    </a-row>

                    <a-row :gutter="16">
                        <a-col :span="12">
                            <a-form-item label="主机地址" name="host">
                                <a-input v-model:value="formState.host" placeholder="请输入主机地址" />
                            </a-form-item>
                        </a-col>
                        <a-col :span="12">
                            <a-form-item label="端口" name="port">
                                <a-input-number v-model:value="formState.port" :min="1" :max="65535" style="width: 100%" />
                            </a-form-item>
                        </a-col>
                    </a-row>

                    <a-row :gutter="16">
                        <a-col :span="12">
                            <a-form-item label="购买时间" name="purchase_date">
                                <a-date-picker
                                    v-model:value="formState.purchase_date"
                                    style="width: 100%"
                                    showTime
                                />
                            </a-form-item>
                        </a-col>
                        <a-col :span="12">
                            <a-form-item label="到期时间" name="expire_date">
                                <a-date-picker
                                    v-model:value="formState.expire_date"
                                    style="width: 100%"
                                    showTime
                                />
                            </a-form-item>
                        </a-col>
                    </a-row>

                    <a-form-item label="节点配置" name="config">
                        <a-textarea
                            v-model:value="formState.config"
                            :rows="6"
                            placeholder="请输入节点配置"
                        />
                        <template v-if="templates.length > 0">
                            <a-divider>或从模板创建</a-divider>
                            <a-select
                                style="width: 100%"
                                placeholder="选择模板"
                                @change="handleTemplateSelect"
                            >
                                <a-select-option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">
                                    {{ tpl.name }}
                                </a-select-option>
                            </a-select>
                        </template>
                    </a-form-item>

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

                    <a-form-item label="备注" name="remark">
                        <a-textarea
                            v-model:value="formState.remark"
                            :rows="2"
                            placeholder="请输入备注信息"
                        />
                    </a-form-item>
                </a-form>
            </a-modal>

            <!-- 节点模板对话框 -->
            <a-modal
                v-model:visible="templateModalVisible"
                title="节点模板管理"
                width="800px"
                @ok="handleTemplateModalOk"
            >
                <a-table
                    :columns="templateColumns"
                    :data-source="templates"
                    :pagination="false"
                >
                    <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'action'">
                            <a-space>
                                <a @click="useTemplate(record)">使用</a>
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
            </a-modal>

            <!-- 节点详情对话框 -->
            <a-modal
                v-model:visible="detailVisible"
                title="节点详情"
                :footer="null"
                width="800px"
            >
                <a-descriptions bordered>
                    <a-descriptions-item label="节点名称" span="2">
                        {{ currentNode?.name }}
                    </a-descriptions-item>
                    <a-descriptions-item label="状态" span="1">
                        <a-tag :color="currentNode?.status === 'active' ? 'success' : 'error'">
                            {{ currentNode?.status === 'active' ? '正常' : '异常' }}
                        </a-tag>
                    </a-descriptions-item>
                    <a-descriptions-item label="节点类型" span="1">
                        <a-tag :color="currentNode?.type === 'vless' ? 'blue' : 'purple'">
                            {{ currentNode?.type.toUpperCase() }}
                        </a-tag>
                    </a-descriptions-item>
                    <a-descriptions-item label="国家/地区" span="1">
                        {{ getCountryName(currentNode?.country) }}
                    </a-descriptions-item>
                    <a-descriptions-item label="到期时间" span="1">
                        {{ formatDate(currentNode?.expire_date) }}
                    </a-descriptions-item>
                    <a-descriptions-item label="节点配置" span="3">
                        <pre>{{ currentNode?.config }}</pre>
                    </a-descriptions-item>
                    <a-descriptions-item label="备注" span="3">
                        {{ currentNode?.remark || '无' }}
                    </a-descriptions-item>
                </a-descriptions>

                <a-divider>检测历史</a-divider>
                
                <a-timeline>
                    <a-timeline-item
                        v-for="(check, index) in currentNode?.check_history"
                        :key="index"
                        :color="check.status === 'success' ? 'green' : 'red'"
                    >
                        <p>{{ formatDate(check.check_time) }}</p>
                        <p>状态: {{ check.status === 'success' ? '正常' : '异常' }}</p>
                        <p>延迟: {{ check.latency }}ms</p>
                        <p v-if="check.error">错误信息: {{ check.error }}</p>
                    </a-timeline-item>
                </a-timeline>
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
        const nodes = ref([])
        
        const columns = [
            { title: '节点名称', dataIndex: 'name', key: 'name' },
            { title: '类型', dataIndex: 'type', key: 'type' },
            { title: '状态', dataIndex: 'status', key: 'status' },
            { title: '国家/地区', dataIndex: 'country', key: 'country' },
            { title: '延迟', dataIndex: 'latency', key: 'latency' },
            { title: '到期时间', dataIndex: 'expire_date', key: 'expire_date' },
            { title: '操作', key: 'action', width: 250 }
        ]

        // 搜索表单
        const searchForm = ref({
            name: '',
            type: undefined,
            status: undefined,
            country: undefined
        })

        // 表单相关
        const formRef = ref(null)
        const modalVisible = ref(false)
        const modalMode = ref('create')
        const modalLoading = ref(false)
        const formState = ref({
            name: '',
            type: 'vless',
            country: 'CN',
            city: '',
            host: '',
            port: 443,
            config: '',
            purchase_date: null,
            expire_date: null,
            bandwidth_limit: null,
            remark: ''
        })

        const rules = {
            name: [{ required: true, message: '请输入节点名称' }],
            type: [{ required: true, message: '请选择节点类型' }],
            country: [{ required: true, message: '请选择国家/地区' }],
            host: [{ required: true, message: '请输入主机地址' }],
            port: [{ required: true, message: '请输入端口' }],
            config: [{ required: true, message: '请输入节点配置' }]
        }

        // 模板相关
        const templateModalVisible = ref(false)
        const templates = ref([])
        const templateColumns = [
            { title: '模板名称', dataIndex: 'name', key: 'name' },
            { title: '类型', dataIndex: 'type', key: 'type' },
            { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
            { title: '操作', key: 'action', width: 150 }
        ]

        // 详情对话框
        const detailVisible = ref(false)
        const currentNode = ref(null)

        // 获取节点列表
        const fetchNodes = async () => {
            loading.value = true
            try {
                const response = await request.node.getList({
                    page: currentPage.value,
                    pageSize: pageSize.value,
                    ...searchForm.value
                })
                nodes.value = response.data.nodes
                total.value = response.data.total
            } catch (error) {
                antd.message.error('获取节点列表失败')
            } finally {
                loading.value = false
            }
        }

        // 获取模板列表
        const fetchTemplates = async () => {
            try {
                const response = await request.node.getTemplates()
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
                type: 'vless',
                country: 'CN',
                city: '',
                host: '',
                port: 443,
                config: '',
                purchase_date: null,
                expire_date: null,
                bandwidth_limit: null,
                remark: ''
            }
            modalVisible.value = true
        }

        // 显示编辑对话框
        const showEditModal = (record) => {
            modalMode.value = 'edit'
            formState.value = {
                ...record,
                purchase_date: record.purchase_date ? moment(record.purchase_date) : null,
                expire_date: record.expire_date ? moment(record.expire_date) : null
            }
            modalVisible.value = true
        }

        // 显示模板对话框
        const showTemplateModal = () => {
            fetchTemplates()
            templateModalVisible.value = true
        }

        // 显示详情对话框
        const showDetailModal = async (record) => {
            try {
                const response = await request.node.getDetail(record.id)
                currentNode.value = response.data
                detailVisible.value = true
            } catch (error) {
                antd.message.error('获取节点详情失败')
            }
        }

        // 处理表单提交
        const handleModalOk = async () => {
            try {
                await formRef.value.validate()
                modalLoading.value = true

                const data = {
                    ...formState.value,
                    purchase_date: formState.value.purchase_date?.format('YYYY-MM-DD HH:mm:ss'),
                    expire_date: formState.value.expire_date?.format('YYYY-MM-DD HH:mm:ss')
                }

                if (modalMode.value === 'create') {
                    await request.node.create(data)
                    antd.message.success('创建成功')
                } else {
                    await request.node.update(formState.value.id, data)
                    antd.message.success('更新成功')
                }

                modalVisible.value = false
                fetchNodes()
            } catch (error) {
                antd.message.error(modalMode.value === 'create' ? '创建失败' : '更新失败')
            } finally {
                modalLoading.value = false
            }
        }

        // 处理删除
        const handleDelete = async (record) => {
            try {
                await request.node.delete(record.id)
                antd.message.success('删除成功')
                fetchNodes()
            } catch (error) {
                antd.message.error('删除失败')
            }
        }

        // 处理节点检测
        const handleCheck = async (record) => {
            try {
                await request.node.check(record.id)
                antd.message.success('检测完成')
                fetchNodes()
            } catch (error) {
                antd.message.error('检测失败')
            }
        }

        // 批量检测节点
        const handleBatchCheck = async () => {
            try {
                await request.node.batchCheck()
                antd.message.success('批量检测已开始')
                fetchNodes()
            } catch (error) {
                antd.message.error('批量检测失败')
            }
        }

        // 保存为模板
        const saveAsTemplate = async (node) => {
            try {
                await request.node.saveTemplate({
                    name: node.name,
                    type: node.type,
                    config: node.config
                })
                antd.message.success('保存模板成功')
                fetchTemplates()
            } catch (error) {
                antd.message.error('保存模板失败')
            }
        }

        // 使用模板
        const useTemplate = (template) => {
            formState.value = {
                ...formState.value,
                type: template.type,
                config: template.config
            }
            templateModalVisible.value = false
        }

        // 删除模板
        const deleteTemplate = async (template) => {
            try {
                await request.node.deleteTemplate(template.id)
                antd.message.success('删除模板成功')
                fetchTemplates()
            } catch (error) {
                antd.message.error('删除模板失败')
            }
        }

        // 处理模板选择
        const handleTemplateSelect = async (templateId) => {
            try {
                const response = await request.node.getTemplate(templateId)
                formState.value.config = response.data.config
            } catch (error) {
                antd.message.error('获取模板配置失败')
            }
        }

        // 处理搜索
        const handleSearch = () => {
            currentPage.value = 1
            fetchNodes()
        }

        // 处理分页
        const handlePageChange = (page) => {
            currentPage.value = page
            fetchNodes()
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

        // 获取国家名称
        const getCountryName = (code) => {
            const countries = {
                'CN': '中国',
                'HK': '香港',
                'TW': '台湾',
                'JP': '日本',
                'KR': '韩国',
                'SG': '新加坡',
                'US': '美国'
            }
            return countries[code] || code
        }

        // 获取延迟颜色
        const getLatencyColor = (latency) => {
            if (!latency) return '#999'
            if (latency < 100) return '#52c41a'
            if (latency < 200) return '#faad14'
            return '#f5222d'
        }

        onMounted(() => {
            if (isAdmin.value) {
                fetchNodes()
                fetchTemplates()
            } else {
                router.push('/dashboard')
            }
        })

        return {
            isAdmin,
            loading,
            currentPage,
            pageSize,
            total,
            nodes,
            columns,
            searchForm,
            formRef,
            modalVisible,
            modalMode,
            modalLoading,
            formState,
            rules,
            templateModalVisible,
            templates,
            templateColumns,
            detailVisible,
            currentNode,
            showCreateModal,
            showEditModal,
            showTemplateModal,
            showDetailModal,
            handleModalOk,
            handleDelete,
            handleCheck,
            handleBatchCheck,
            saveAsTemplate,
            useTemplate,
            deleteTemplate,
            handleTemplateSelect,
            handleSearch,
            handlePageChange,
            disabledDate,
            formatDate,
            getCountryName,
            getLatencyColor
        }
    }
} 