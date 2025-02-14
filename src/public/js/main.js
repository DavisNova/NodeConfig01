// 节点名称配置相关功能
document.addEventListener('DOMContentLoaded', function() {
    // 缓存DOM元素
    const elements = {
        useSequentialNames: document.getElementById('useSequentialNames'),
        sequentialNameInput: document.getElementById('sequentialNameInput'),
        customNameBtn: document.getElementById('customNameBtn'),
        customNameInputs: document.getElementById('customNameInputs'),
        addTimeStamp: document.getElementById('addTimeStamp'),
        subscriptionName: document.getElementById('subscriptionName'),
        baseNodeName: document.getElementById('baseNodeName')
    };

    // 从localStorage恢复上次的设置
    const savedConfig = JSON.parse(localStorage.getItem('nodeConfigSettings') || '{}');
    if (savedConfig) {
        elements.addTimeStamp.checked = savedConfig.addTimeStamp || false;
        elements.useSequentialNames.checked = savedConfig.useSequentialNames || false;
        elements.baseNodeName.value = savedConfig.baseNodeName || '';
        elements.subscriptionName.value = savedConfig.subscriptionName || '';
    }

    // 序号命名输入框控制
    elements.useSequentialNames.addEventListener('change', function() {
        if (this.checked) {
            elements.sequentialNameInput.classList.add('show');
            elements.baseNodeName.focus();
        } else {
            elements.sequentialNameInput.classList.remove('show');
        }
        saveSettings();
    });

    // 保存设置到localStorage
    function saveSettings() {
        const settings = {
            addTimeStamp: elements.addTimeStamp.checked,
            useSequentialNames: elements.useSequentialNames.checked,
            baseNodeName: elements.baseNodeName.value,
            subscriptionName: elements.subscriptionName.value
        };
        localStorage.setItem('nodeConfigSettings', JSON.stringify(settings));
    }

    // 添加实时预览功能
    function updateNamePreview() {
        const previewContainer = document.getElementById('namePreview');
        if (!previewContainer) return;

        const config = {
            addTimeStamp: elements.addTimeStamp.checked,
            useSequentialNames: elements.useSequentialNames.checked,
            baseNodeName: elements.baseNodeName.value
        };

        const previewName = generateNodeName(0, config);
        previewContainer.textContent = `预览: ${previewName}`;
    }

    // 为所有输入元素添加变更监听
    ['addTimeStamp', 'useSequentialNames', 'baseNodeName'].forEach(id => {
        elements[id].addEventListener('change', () => {
            updateNamePreview();
            saveSettings();
        });
    });

    // 自定义名称按钮控制
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