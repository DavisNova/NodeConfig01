// 节点名称配置相关功能
document.addEventListener('DOMContentLoaded', function() {
    // 序号命名输入框控制
    const useSequentialNames = document.getElementById('useSequentialNames');
    const sequentialNameInput = document.getElementById('sequentialNameInput');
    
    useSequentialNames.addEventListener('change', function() {
        if (this.checked) {
            sequentialNameInput.classList.add('show');
        } else {
            sequentialNameInput.classList.remove('show');
        }
    });

    // 自定义名称按钮控制
    const customNameBtn = document.getElementById('customNameBtn');
    const customNameInputs = document.getElementById('customNameInputs');
    
    customNameBtn.addEventListener('click', function() {
        const nodeCount = getNodeCount(); // 获取当前配置的节点数量
        customNameInputs.innerHTML = ''; // 清空现有输入框
        
        for (let i = 0; i < nodeCount; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group mb-2';
            inputGroup.innerHTML = `
                <span class="input-group-text">节点 ${i + 1}</span>
                <input type="text" class="form-control custom-node-name" 
                       placeholder="输入节点名称" data-index="${i}">
            `;
            customNameInputs.appendChild(inputGroup);
        }
        customNameInputs.classList.add('show');
    });
});

// 生成节点名称的函数
function generateNodeName(index, config) {
    let name = '';
    
    // 使用自定义名称
    if (config.customNames && config.customNames[index]) {
        name = config.customNames[index];
    }
    // 使用序号命名
    else if (config.useSequentialNames && config.baseNodeName) {
        name = `${config.baseNodeName}${String(index + 1).padStart(3, '0')}`;
    }
    // 默认名称
    else {
        name = `Node${String(index + 1).padStart(3, '0')}`;
    }
    
    // 添加时间后缀
    if (config.addTimeStamp) {
        const now = new Date();
        const timeStamp = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');
        name += timeStamp;
    }
    
    return name;
}

// 生成订阅名称的函数
function generateSubscriptionName() {
    const customName = document.getElementById('subscriptionName').value;
    if (customName) {
        return customName;
    }
    
    const timestamp = Math.floor(Date.now() / 1000);
    return `config_${timestamp}`;
}

// 添加错误处理和加载状态
async function generateAndDownload() {
    try {
        const button = document.querySelector('#generateBtn');
        button.disabled = true;
        button.innerHTML = '<i class="bi bi-hourglass"></i> 生成中...';

        // ... 生成逻辑 ...

    } catch (error) {
        showError('生成配置失败: ' + error.message);
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="bi bi-download"></i> 下载配置';
    }
} 