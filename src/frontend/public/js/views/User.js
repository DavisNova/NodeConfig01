import { ref, onMounted, computed } from 'vue'
import { useStore } from 'vuex'
import { request } from '../utils/request.js'

export default {
    template: `
        <div class="user-page">
            <!-- 页面标题 -->
            <div class="page-header">
                <a-page-header
                    title="用户管理"
                    :ghost="false"
                >
                    <template #extra>
                        <a-button type="primary" @click="showCreateModal">
                            <user-add-outlined />
                            添加用户
                        </a-button>
                    </template>
                </a-page-header>
            </div>

            <!-- 搜索和筛选 -->
            <a-card style="margin-top: 16px">
                <a-form layout="inline">
                    <a-form-item label="用户名">
                        <a-input
                            v-model:value="searchForm.username"
                            placeholder="搜索用户名"
                            allowClear
                            @change="handleSearch"
                        />
                    </a-form-item>
                    <a-form-item label="邮箱">
                        <a-input
                            v-model:value="searchForm.email"
                            placeholder="搜索邮箱"
                            allowClear
                            @change="handleSearch"
                        />
                    </a-form-item>
                    <a-form-item label="角色">
                        <a-select
                            v-model:value="searchForm.role"
                            style="width: 120px"
                            allowClear
                            @change="handleSearch"
                        >
                            <a-select-option value="admin">管理员</a-select-option>
                            <a-select-option value="user">普通用户</a-select-option>
                        </a-select>
                    </a-form-item>
                </a-form>
            </a-card>

            <!-- 用户列表 -->
            <a-card style="margin-top: 16px">
                <a-table
                    :columns="columns"
                    :data-source="users"
                    :loading="loading"
                    :pagination="{
                        total: total,
                        current: currentPage,
                        pageSize: pageSize,
                        onChange: handlePageChange
                    }"
                >
                    <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'role'">
                            <a-tag :color="record.role === 'admin' ? 'red' : 'blue'">
                                {{ record.role === 'admin' ? '管理员' : '普通用户' }}
                            </a-tag>
                        </template>
                        <template v-if="column.key === 'status'">
                            <a-badge
                                :status="record.status === 'active' ? 'success' : 'error'"
                                :text="record.status === 'active' ? '正常' : '禁用'"
                            />
                        </template>
                        <template v-if="column.key === 'action'">
                            <a-space>
                                <a @click="showDetailModal(record)">详情</a>
                                <a @click="showEditModal(record)">编辑</a>
                                <a-popconfirm
                                    :title="record.status === 'active' ? '确定要禁用该用户吗？' : '确定要启用该用户吗？'"
                                    @confirm="handleToggleStatus(record)"
                                >
                                    <a>{{ record.status === 'active' ? '禁用' : '启用' }}</a>
                                </a-popconfirm>
                                <a-popconfirm
                                    title="确定要删除该用户吗？"
                                    @confirm="handleDelete(record)"
                                >
                                    <a class="danger-link">删除</a>
                                </a-popconfirm>
                            </a-space>
                        </template>
                    </template>
                </a-table>
            </a-card>

            <!-- 创建/编辑用户对话框 -->
            <a-modal
                v-model:visible="modalVisible"
                :title="modalMode === 'create' ? '添加用户' : '编辑用户'"
                @ok="handleModalOk"
                :confirmLoading="modalLoading"
                width="600px"
            >
                <a-form
                    ref="formRef"
                    :model="formState"
                    :rules="rules"
                    layout="vertical"
                >
                    <a-form-item label="用户名" name="username">
                        <a-input
                            v-model:value="formState.username"
                            placeholder="请输入用户名"
                            :disabled="modalMode === 'edit'"
                        />
                    </a-form-item>
                    
                    <a-form-item
                        label="密码"
                        name="password"
                        :rules="modalMode === 'create' ? [{ required: true, message: '请输入密码' }] : []"
                    >
                        <a-input-password
                            v-model:value="formState.password"
                            placeholder="请输入密码"
                        />
                        <div v-if="modalMode === 'edit'" style="color: #999; font-size: 12px;">
                            留空表示不修改密码
                        </div>
                    </a-form-item>

                    <a-form-item label="邮箱" name="email">
                        <a-input
                            v-model:value="formState.email"
                            placeholder="请输入邮箱"
                        />
                    </a-form-item>

                    <a-form-item label="角色" name="role">
                        <a-select v-model:value="formState.role">
                            <a-select-option value="admin">管理员</a-select-option>
                            <a-select-option value="user">普通用户</a-select-option>
                        </a-select>
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

            <!-- 用户详情对话框 -->
            <a-modal
                v-model:visible="detailVisible"
                title="用户详情"
                :footer="null"
                width="800px"
            >
                <a-descriptions bordered>
                    <a-descriptions-item label="用户名" span="2">
                        {{ currentUser?.username }}
                    </a-descriptions-item>
                    <a-descriptions-item label="角色" span="1">
                        <a-tag :color="currentUser?.role === 'admin' ? 'red' : 'blue'">
                            {{ currentUser?.role === 'admin' ? '管理员' : '普通用户' }}
                        </a-tag>
                    </a-descriptions-item>
                    <a-descriptions-item label="邮箱" span="3">
                        {{ currentUser?.email }}
                    </a-descriptions-item>
                    <a-descriptions-item label="状态" span="1">
                        <a-badge
                            :status="currentUser?.status === 'active' ? 'success' : 'error'"
                            :text="currentUser?.status === 'active' ? '正常' : '禁用'"
                        />
                    </a-descriptions-item>
                    <a-descriptions-item label="创建时间" span="2">
                        {{ formatDate(currentUser?.created_at) }}
                    </a-descriptions-item>
                    <a-descriptions-item label="备注" span="3">
                        {{ currentUser?.remark || '无' }}
                    </a-descriptions-item>
                </a-descriptions>

                <a-divider>订阅信息</a-divider>

                <a-table
                    :columns="subscriptionColumns"
                    :data-source="currentUser?.subscriptions"
                    :pagination="false"
                    size="small"
                >
                    <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'status'">
                            <a-tag :color="record.status === 'active' ? 'success' : 'error'">
                                {{ record.status === 'active' ? '活跃' : '停用' }}
                            </a-tag>
                        </template>
                    </template>
                </a-table>
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
        const users = ref([])
        
        const columns = [
            { title: '用户名', dataIndex: 'username', key: 'username' },
            { title: '邮箱', dataIndex: 'email', key: 'email' },
            { title: '角色', dataIndex: 'role', key: 'role' },
            { title: '状态', dataIndex: 'status', key: 'status' },
            { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
            { title: '操作', key: 'action', width: 200 }
        ]

        const subscriptionColumns = [
            { title: '订阅名称', dataIndex: 'name', key: 'name' },
            { title: '状态', dataIndex: 'status', key: 'status' },
            { title: '节点数量', dataIndex: 'nodeCount', key: 'nodeCount' },
            { title: '到期时间', dataIndex: 'expire_at', key: 'expire_at' }
        ]

        // 搜索表单
        const searchForm = ref({
            username: '',
            email: '',
            role: undefined
        })

        // 表单相关
        const formRef = ref(null)
        const modalVisible = ref(false)
        const modalMode = ref('create')
        const modalLoading = ref(false)
        const formState = ref({
            username: '',
            password: '',
            email: '',
            role: 'user',
            remark: ''
        })

        const rules = {
            username: [{ required: true, message: '请输入用户名' }],
            email: [{ type: 'email', message: '请输入有效的邮箱地址' }],
            role: [{ required: true, message: '请选择用户角色' }]
        }

        // 详情对话框
        const detailVisible = ref(false)
        const currentUser = ref(null)

        // 获取用户列表
        const fetchUsers = async () => {
            loading.value = true
            try {
                const response = await request.user.getList({
                    page: currentPage.value,
                    pageSize: pageSize.value,
                    ...searchForm.value
                })
                users.value = response.data.users
                total.value = response.data.total
            } catch (error) {
                antd.message.error('获取用户列表失败')
            } finally {
                loading.value = false
            }
        }

        // 显示创建对话框
        const showCreateModal = () => {
            modalMode.value = 'create'
            formState.value = {
                username: '',
                password: '',
                email: '',
                role: 'user',
                remark: ''
            }
            modalVisible.value = true
        }

        // 显示编辑对话框
        const showEditModal = (record) => {
            modalMode.value = 'edit'
            formState.value = {
                ...record,
                password: '' // 编辑时不显示密码
            }
            modalVisible.value = true
        }

        // 显示详情对话框
        const showDetailModal = async (record) => {
            try {
                const response = await request.user.getDetail(record.id)
                currentUser.value = response.data
                detailVisible.value = true
            } catch (error) {
                antd.message.error('获取用户详情失败')
            }
        }

        // 处理表单提交
        const handleModalOk = async () => {
            try {
                await formRef.value.validate()
                modalLoading.value = true

                const data = { ...formState.value }
                if (modalMode.value === 'edit' && !data.password) {
                    delete data.password
                }

                if (modalMode.value === 'create') {
                    await request.user.create(data)
                    antd.message.success('创建成功')
                } else {
                    await request.user.update(currentUser.value.id, data)
                    antd.message.success('更新成功')
                }

                modalVisible.value = false
                fetchUsers()
            } catch (error) {
                antd.message.error(modalMode.value === 'create' ? '创建失败' : '更新失败')
            } finally {
                modalLoading.value = false
            }
        }

        // 处理删除
        const handleDelete = async (record) => {
            try {
                await request.user.delete(record.id)
                antd.message.success('删除成功')
                fetchUsers()
            } catch (error) {
                antd.message.error('删除失败')
            }
        }

        // 处理启用/禁用
        const handleToggleStatus = async (record) => {
            try {
                await request.user.toggleStatus(record.id)
                antd.message.success(record.status === 'active' ? '已禁用' : '已启用')
                fetchUsers()
            } catch (error) {
                antd.message.error('操作失败')
            }
        }

        // 处理搜索
        const handleSearch = () => {
            currentPage.value = 1
            fetchUsers()
        }

        // 处理分页
        const handlePageChange = (page) => {
            currentPage.value = page
            fetchUsers()
        }

        // 格式化日期
        const formatDate = (date) => {
            if (!date) return '-'
            return moment(date).format('YYYY-MM-DD HH:mm:ss')
        }

        onMounted(() => {
            if (isAdmin.value) {
                fetchUsers()
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
            users,
            columns,
            subscriptionColumns,
            searchForm,
            formRef,
            modalVisible,
            modalMode,
            modalLoading,
            formState,
            rules,
            detailVisible,
            currentUser,
            showCreateModal,
            showEditModal,
            showDetailModal,
            handleModalOk,
            handleDelete,
            handleToggleStatus,
            handleSearch,
            handlePageChange,
            formatDate
        }
    }
} 