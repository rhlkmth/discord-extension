document.addEventListener('DOMContentLoaded', () => {
  // Setup accordion behavior
  const setupHeader = document.getElementById('setup-header');
  const setupSection = document.getElementById('setup-section');

  // Load saved settings
  chrome.storage.sync.get(['webhookUrl', 'username'], (data) => {
    if (data.webhookUrl) document.getElementById('webhook-url').value = data.webhookUrl;
    if (data.username) document.getElementById('username').value = data.username;
  });

  // Save settings
  document.getElementById('save-settings').addEventListener('click', () => {
    const webhookUrl = document.getElementById('webhook-url').value.trim();
    const username = document.getElementById('username').value.trim();

    if (!webhookUrl) {
      showError('setup-error', 'Please enter a webhook URL');
      return;
    }

    chrome.storage.sync.set({ webhookUrl, username }, () => {
      showStatus('setup-status');
    });
  });

  // Reset configuration
  document.getElementById('reset-config').addEventListener('click', () => {
    chrome.storage.sync.clear(() => {
      document.getElementById('webhook-url').value = '';
      document.getElementById('username').value = '';
      showStatus('setup-status');
    });
  });

  // Share options behavior
  const shareOptions = document.querySelectorAll('.share-option');
  const urlShare = document.getElementById('url-share');
  const fileShare = document.getElementById('file-share');

  shareOptions.forEach(option => {
    option.addEventListener('click', () => {
      shareOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');

      const optionType = option.dataset.option;
      urlShare.classList.toggle('active', optionType === 'url');
      fileShare.classList.toggle('active', optionType === 'file');
    });
  });

  // Set initial active option
  shareOptions[0].click();

  // Share link
  document.getElementById('share-link').addEventListener('click', () => {
    const url = document.getElementById('link-url').value.trim();
    const description = document.getElementById('link-description').value.trim();

    if (!url) {
      showError('share-error', 'Please enter a URL');
      return;
    }

    chrome.storage.sync.get(['webhookUrl', 'username'], (data) => {
      if (!data.webhookUrl) {
        showError('share-error', 'Please set up webhook URL first');
        return;
      }

      let content = '';
      if (description) content += description + '\n';
      content += url;

      const payload = {
        username: data.username || 'Webhook Sender',
        content
      };

      fetch(data.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        showStatus('share-status');
        document.getElementById('link-url').value = '';
        document.getElementById('link-description').value = '';
      })
      .catch(error => showError('share-error', 'Failed to send webhook'));
    });
  });

  // File upload handling
  const dropArea = document.getElementById('drop-area');
  const fileInput = document.getElementById('file-input');
  const fileList = document.getElementById('file-list');
  let selectedFiles = [];

  dropArea.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.classList.add('active');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.classList.remove('active');
    });
  });

  dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    handleFiles(dt.files);
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  function handleFiles(files) {
    selectedFiles = Array.from(files);
    updateFileList();
  }

  function updateFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      
      const fileInfo = document.createElement('div');
      fileInfo.className = 'file-info';
      
      const fileName = document.createElement('div');
      fileName.className = 'file-name';
      fileName.textContent = file.name;
      
      const fileSize = document.createElement('div');
      fileSize.className = 'file-size';
      fileSize.textContent = formatFileSize(file.size);
      
      const removeButton = document.createElement('button');
      removeButton.className = 'remove-file';
      removeButton.textContent = 'Remove';
      removeButton.onclick = () => removeFile(index);
      
      fileInfo.appendChild(fileName);
      fileInfo.appendChild(fileSize);
      fileItem.appendChild(fileInfo);
      fileItem.appendChild(removeButton);
      
      const progress = document.createElement('div');
      progress.className = 'upload-progress';
      const progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progress.appendChild(progressBar);
      fileItem.appendChild(progress);
      
      fileList.appendChild(fileItem);
    });
  }

  function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Upload files
  document.getElementById('upload-files').addEventListener('click', () => {
    if (selectedFiles.length === 0) {
      showError('upload-error', 'Please select files to upload');
      return;
    }

    chrome.storage.sync.get(['webhookUrl', 'username'], (data) => {
      if (!data.webhookUrl) {
        showError('upload-error', 'Please set up webhook URL first');
        return;
      }

      const message = document.getElementById('message').value.trim();
      const formData = new FormData();
      const payload = {
        username: data.username || 'Webhook Sender',
        content: message || 'Uploaded files:'
      };
      formData.append('payload_json', JSON.stringify(payload));

      // Discord webhook expects each file to have a unique key
      selectedFiles.forEach((file, index) => {
        formData.append(`file${index}`, file); // Use unique key for each file
        const progressBar = fileList.children[index].querySelector('.progress-bar');
        progressBar.style.width = '50%';
      });

      fetch(data.webhookUrl, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        selectedFiles.forEach((file, index) => {
          const progressBar = fileList.children[index].querySelector('.progress-bar');
          progressBar.style.width = '100%';
        });
        showStatus('upload-status');
        selectedFiles = [];
        fileInput.value = '';
        document.getElementById('message').value = '';
        setTimeout(() => {
          updateFileList();
        }, 1000);
      })
      .catch(error => {
        selectedFiles.forEach((file, index) => {
          const progressBar = fileList.children[index].querySelector('.progress-bar');
          progressBar.style.width = '0';
        });
        showError('upload-error', 'Failed to upload files');
      });
    });
  });

  // Helper functions
  function showStatus(id) {
    const element = document.getElementById(id);
    element.style.display = 'block';
    setTimeout(() => {
      element.style.display = 'none';
    }, 3000);
  }

  function showError(id, message) {
    const element = document.getElementById(id);
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
      element.style.display = 'none';
    }, 3000);
  }
});