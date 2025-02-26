import { ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { request } from '../utils/request.js'

export default {
    template: `
        <div class="profile-page">
            <!-- 页面标题 -->
            <div class="page-header">
                <a-page-header
                    title="个人信息"
                    :ghost="false"
                />
            </div>

            <div style="max-width: 800px; margin: 24px auto;">
                <!-- 基本信息卡片 -->
                <a-card title="基本信息" :bordered="false">
                    <template #extra>
                        <a-button type="link" @click="handleEditProfile">
                            <edit-outlined />
                            编辑资料
                        </a-button>
                    </template>
                    
                    <a-descriptions :column="2">
                        <a-descriptions-item label="用户名">
                            {{ userInfo.username }}
                        </a-descriptions-item>
                        <a-descriptions-item label="角色">
                            <a-tag :color="userInfo.role === 'admin' ? 'red' : 'blue'">
                                {{ userInfo.role === 'admin' ? '管理员' : '普通用户' }}
                            </a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item label="邮箱">
                            {{ userInfo.email || '未设置' }}
                        </a-descriptions-item>
                        <a-descriptions-item label="注册时间">
                            {{ formatDate(userInfo.created_at) }}
                        </a-descriptions-item>
                    </a-descriptions>
                </a-card>

                <!-- 订阅统计卡片 -->
                <a-card title="订阅统计" :bordered="false" style="margin-top: 24px">
                    <a-row :gutter="16">
                        <a-col :span="8">
                            <a-statistic
                                title="活跃订阅"
                                :value="statistics.activeSubscriptions"
                                :valueStyle="{ color: '#3f8600' }"
                            >
                                <template #prefix>
                                    <check-circle-outlined />
                                </template>
                            </a-statistic>
                        </a-col>
                        <a-col :span="8">
                            <a-statistic
                                title="总节点数"
                                :value="statistics.totalNodes"
                            >
                                <template #prefix>
                                    <cluster-outlined />
                                </template>
                            </a-statistic>
                        </a-col>
                        <a-col :span="8">
                            <a-statistic
                                title="即将过期"
                                :value="statistics.expiringNodes"
                                :valueStyle="{ color: '#cf1322' }"
                            >
                                <template #prefix>
                                    <warning-outlined />
                                </template>
                            </a-statistic>
                        </a-col>
                    </a-row>
                </a-card>

                <!-- 安全设置卡片 -->
                <a-card title="安全设置" :bordered="false" style="margin-top: 24px">
                    <a-list :split="false">
                        <a-list-item>
                            <template #actions>
                                <a @click="showChangePasswordModal">修改</a>
                            </template>
                            <a-list-item-meta title="账户密码">
                                <template #description>
                                    定期修改密码可以保护账户安全
                                </template>
                            </a-list-item-meta>
                        </a-list-item>
                        <a-list-item>
                            <template #actions>
                                <a @click="showBindEmailModal" v-if="!userInfo.email">绑定</a>
                                <a @click="showChangeEmailModal" v-else>修改</a>
                            </template>
                            <a-list-item-meta title="邮箱绑定">
                                <template #description>
                                    {{ userInfo.email ? '已绑定邮箱：' + userInfo.email : '未绑定邮箱' }}
                                </template>
                            </a-list-item-meta>
                        </a-list-item>
                    </a-list>
                </a-card>
            </div>

            <!-- 编辑个人信息对话框 -->
            <a-modal
                v-model:visible="editProfileVisible"
                title="编辑个人信息"
                @ok="handleEditProfileSubmit"
                :confirmLoading="submitLoading"
            >
                <a-form
                    ref="editProfileFormRef"
                    :model="editProfileForm"
                    :rules="editProfileRules"
                    layout="vertical"
                >
                    <a-form-item label="用户名" name="username">
                        <a-input
                            v-model:value="editProfileForm.username"
                            disabled
                        />
                    </a-form-item>
                    <a-form-item label="邮箱" name="email">
                        <a-input
                            v-model:value="editProfileForm.email"
                            placeholder="请输入邮箱"
                        />
                    </a-form-item>
                </a-form>
            </a-modal>

            <!-- 修改密码对话框 -->
            <a-modal
                v-model:visible="changePasswordVisible"
                title="修改密码"
                @ok="handleChangePasswordSubmit"
                :confirmLoading="submitLoading"
            >
                <a-form
                    ref="changePasswordFormRef"
                    :model="changePasswordForm"
                    :rules="changePasswordRules"
                    layout="vertical"
                >
                    <a-form-item label="当前密码" name="oldPassword">
                        <a-input-password
                            v-model:value="changePasswordForm.oldPassword"
                            placeholder="请输入当前密码"
                        />
                    </a-form-item>
                    <a-form-item label="新密码" name="newPassword">
                        <a-input-password
                            v-model:value="changePasswordForm.newPassword"
                            placeholder="请输入新密码"
                        />
                    </a-form-item>
                    <a-form-item label="确认新密码" name="confirmPassword">
                        <a-input-password
                            v-model:value="changePasswordForm.confirmPassword"
                            placeholder="请再次输入新密码"
                        />
                    </a-form-item>
                </a-form>
            </a-modal>

            <!-- 绑定/修改邮箱对话框 -->
            <a-modal
                v-model:visible="emailModalVisible"
                :title="userInfo.email ? '修改邮箱' : '绑定邮箱'"
                @ok="handleEmailSubmit"
                :confirmLoading="submitLoading"
            >
                <a-form
                    ref="emailFormRef"
                    :model="emailForm"
                    :rules="emailRules"
                    layout="vertical"
                >
                    <a-form-item label="新邮箱" name="email">
                        <a-input
                            v-model:value="emailForm.email"
                            placeholder="请输入新邮箱"
                        />
                    </a-form-item>
                    <a-form-item label="验证码" name="code">
                        <a-row :gutter="8">
                            <a-col :span="16">
                                <a-input
                                    v-model:value="emailForm.code"
                                    placeholder="请输入验证码"
                                />
                            </a-col>
                            <a-col :span="8">
                                <a-button
                                    :disabled="!!countdown"
                                    @click="handleSendCode"
                                    block
                                >
                                    {{ countdown ? \`\${countdown}秒后重试\` : '获取验证码' }}
                                </a-button>
                            </a-col>
                        </a-row>
                    </a-form-item>
                </a-form>
            </a-modal>
        </div>
    `,

    setup() {
        const store = useStore()

        // 用户信息
        const userInfo = ref({})
        const statistics = ref({
            activeSubscriptions: 0,
            totalNodes: 0,
            expiringNodes: 0
        })

        // 编辑个人信息相关
        const editProfileVisible = ref(false)
        const editProfileFormRef = ref(null)
        const editProfileForm = ref({
            username: '',
            email: ''
        })
        const editProfileRules = {
            email: [{ type: 'email', message: '请输入有效的邮箱地址' }]
        }

        // 修改密码相关
        const changePasswordVisible = ref(false)
        const changePasswordFormRef = ref(null)
        const changePasswordForm = ref({
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
        })
        const changePasswordRules = {
            oldPassword: [{ required: true, message: '请输入当前密码' }],
            newPassword: [
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码长度不能小于6位' }
            ],
            confirmPassword: [
                { required: true, message: '请确认新密码' },
                {
                    validator: async (rule, value) => {
                        if (value !== changePasswordForm.value.newPassword) {
                            throw new Error('两次输入的密码不一致')
                        }
                    }
                }
            ]
        }

        // 邮箱相关
        const emailModalVisible = ref(false)
        const emailFormRef = ref(null)
        const emailForm = ref({
            email: '',
            code: ''
        })
        const emailRules = {
            email: [
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
            ],
            code: [{ required: true, message: '请输入验证码' }]
        }

        // 验证码倒计时
        const countdown = ref(0)
        let countdownTimer = null

        // 提交状态
        const submitLoading = ref(false)

        // 获取用户信息
        const fetchUserInfo = async () => {
            try {
                const response = await request.user.getProfile()
                userInfo.value = response.data
                statistics.value = response.data.statistics
            } catch (error) {
                antd.message.error('获取用户信息失败')
            }
        }

        // 编辑个人信息
        const handleEditProfile = () => {
            editProfileForm.value = {
                username: userInfo.value.username,
                email: userInfo.value.email
            }
            editProfileVisible.value = true
        }

        const handleEditProfileSubmit = async () => {
            try {
                await editProfileFormRef.value.validate()
                submitLoading.value = true
                await request.user.updateProfile(editProfileForm.value)
                antd.message.success('更新成功')
                editProfileVisible.value = false
                fetchUserInfo()
            } catch (error) {
                antd.message.error('更新失败')
            } finally {
                submitLoading.value = false
            }
        }

        // 修改密码
        const showChangePasswordModal = () => {
            changePasswordForm.value = {
                oldPassword: '',
                newPassword: '',
                confirmPassword: ''
            }
            changePasswordVisible.value = true
        }

        const handleChangePasswordSubmit = async () => {
            try {
                await changePasswordFormRef.value.validate()
                submitLoading.value = true
                await request.user.changePassword(changePasswordForm.value)
                antd.message.success('密码修改成功，请重新登录')
                changePasswordVisible.value = false
                store.dispatch('logout')
            } catch (error) {
                antd.message.error('密码修改失败')
            } finally {
                submitLoading.value = false
            }
        }

        // 绑定/修改邮箱
        const showBindEmailModal = () => {
            emailForm.value = { email: '', code: '' }
            emailModalVisible.value = true
        }

        const showChangeEmailModal = () => {
            emailForm.value = { email: '', code: '' }
            emailModalVisible.value = true
        }

        const handleEmailSubmit = async () => {
            try {
                await emailFormRef.value.validate()
                submitLoading.value = true
                await request.user.updateEmail(emailForm.value)
                antd.message.success('邮箱更新成功')
                emailModalVisible.value = false
                fetchUserInfo()
            } catch (error) {
                antd.message.error('邮箱更新失败')
            } finally {
                submitLoading.value = false
            }
        }

        // 发送验证码
        const handleSendCode = async () => {
            try {
                await emailFormRef.value.validateFields(['email'])
                await request.user.sendEmailCode(emailForm.value.email)
                antd.message.success('验证码已发送')
                countdown.value = 60
                countdownTimer = setInterval(() => {
                    if (countdown.value > 0) {
                        countdown.value--
                    } else {
                        clearInterval(countdownTimer)
                    }
                }, 1000)
            } catch (error) {
                antd.message.error('验证码发送失败')
            }
        }

        // 格式化日期
        const formatDate = (date) => {
            if (!date) return '-'
            return moment(date).format('YYYY-MM-DD HH:mm:ss')
        }

        onMounted(() => {
            fetchUserInfo()
        })

        return {
            userInfo,
            statistics,
            editProfileVisible,
            editProfileFormRef,
            editProfileForm,
            editProfileRules,
            changePasswordVisible,
            changePasswordFormRef,
            changePasswordForm,
            changePasswordRules,
            emailModalVisible,
            emailFormRef,
            emailForm,
            emailRules,
            countdown,
            submitLoading,
            handleEditProfile,
            handleEditProfileSubmit,
            showChangePasswordModal,
            handleChangePasswordSubmit,
            showBindEmailModal,
            showChangeEmailModal,
            handleEmailSubmit,
            handleSendCode,
            formatDate
        }
    }
} 