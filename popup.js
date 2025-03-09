// Initialize global variables to prevent reference errors
let profiles = [];
let currentProfileId = null;

document.addEventListener('DOMContentLoaded', () => {
  // Setup accordion behavior
  const setupHeader = document.getElementById('setup-header');
  const setupSection = document.getElementById('setup-section');
  const setupForm = document.querySelector('.setup-form');
  const profileSelect = document.getElementById('profile-select');
  const editProfileBtn = document.getElementById('edit-profile');
  const deleteProfileBtn = document.getElementById('delete-profile');
  const profileNameInput = document.getElementById('profile-name');
  
  // Generate a random profile name
  function generateProfileName() {
    const adjectives = ['Cool', 'Awesome', 'Epic', 'Super', 'Mega', 'Ultra', 'Hyper', 'Extreme'];
    const nouns = ['Channel', 'Server', 'Bot', 'Hook', 'Discord', 'Chat', 'Group', 'Team'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdjective}${randomNoun}`;
  }
  
  // Load profiles
  function loadProfiles() {
    chrome.storage.sync.get(['profiles', 'currentProfileId'], (data) => {
      profiles = data.profiles || [];
      currentProfileId = data.currentProfileId || (profiles.length > 0 ? profiles[0].id : null);
      
      // Clear dropdown options except 'Add New Profile'
      while (profileSelect.options.length > 1) {
        profileSelect.remove(1);
      }
      
      // Add profiles to dropdown
      profiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile.id;
        option.textContent = profile.name;
        profileSelect.appendChild(option);
      });
      
      // Select current profile
      if (currentProfileId) {
        profileSelect.value = currentProfileId;
        loadProfileData(currentProfileId);
      }
      
      // Update button states
      updateButtonStates();
    });
  }
  
  // Load profile data into form
  function loadProfileData(profileId) {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      document.getElementById('profile-name').value = profile.name;
      document.getElementById('webhook-url').value = profile.webhookUrl;
      document.getElementById('username').value = profile.username || '';
    } else {
      document.getElementById('profile-name').value = '';
      document.getElementById('webhook-url').value = '';
      document.getElementById('username').value = '';
    }
  }
  
  // Update button states based on selection
  function updateButtonStates() {
    const isNewProfile = profileSelect.value === 'new';
    const hasProfiles = profiles.length > 0;
    
    editProfileBtn.disabled = isNewProfile;
    deleteProfileBtn.disabled = isNewProfile;
    
    // Show/hide setup form
    setupForm.style.display = isNewProfile || profileSelect.value === currentProfileId && editProfileBtn.classList.contains('editing') ? 'block' : 'none';
  }
  
  // Profile select change handler
  profileSelect.addEventListener('change', () => {
    const selectedValue = profileSelect.value;
    
    if (selectedValue === 'new') {
      // Clear form for new profile
      document.getElementById('profile-name').value = '';
      document.getElementById('webhook-url').value = '';
      document.getElementById('username').value = '';
      setupForm.style.display = 'block';
    } else {
      // Load existing profile
      currentProfileId = selectedValue;
      chrome.storage.sync.set({ currentProfileId });
      loadProfileData(selectedValue);
      setupForm.style.display = 'none';
      editProfileBtn.classList.remove('editing');
    }
    
    updateButtonStates();
  });
  
  // Edit profile button
  editProfileBtn.addEventListener('click', () => {
    if (profileSelect.value !== 'new') {
      editProfileBtn.classList.toggle('editing');
      setupForm.style.display = editProfileBtn.classList.contains('editing') ? 'block' : 'none';
    }
  });
  
  // Delete profile button
  deleteProfileBtn.addEventListener('click', () => {
    if (profileSelect.value !== 'new') {
      const profileId = profileSelect.value;
      profiles = profiles.filter(p => p.id !== profileId);
      
      // Update storage
      chrome.storage.sync.set({ profiles }, () => {
        // If we deleted the current profile, select the first available or 'new'
        if (currentProfileId === profileId) {
          currentProfileId = profiles.length > 0 ? profiles[0].id : null;
          chrome.storage.sync.set({ currentProfileId });
        }
        
        loadProfiles();
        showStatus('setup-status', 'Profile deleted');
      });
    }
  });
  
  // Initialize profiles
  loadProfiles();

  // Save settings
  document.getElementById('save-settings').addEventListener('click', () => {
    const webhookUrl = document.getElementById('webhook-url').value.trim();
    const username = document.getElementById('username').value.trim();
    let profileName = document.getElementById('profile-name').value.trim();

    if (!webhookUrl) {
      showError('setup-error', 'Please enter a webhook URL');
      return;
    }

    // Generate random name if not provided
    if (!profileName) {
      profileName = generateProfileName();
    }

    if (profileSelect.value === 'new') {
      // Create new profile
      const newProfile = {
        id: Date.now().toString(),
        name: profileName,
        webhookUrl,
        username
      };
      
      profiles.push(newProfile);
      currentProfileId = newProfile.id;
      
      chrome.storage.sync.set({ profiles, currentProfileId }, () => {
        loadProfiles();
        showStatus('setup-status', 'Profile created');
        setupForm.style.display = 'none';
      });
    } else {
      // Update existing profile
      const profileIndex = profiles.findIndex(p => p.id === profileSelect.value);
      if (profileIndex !== -1) {
        profiles[profileIndex] = {
          ...profiles[profileIndex],
          name: profileName,
          webhookUrl,
          username
        };
        
        chrome.storage.sync.set({ profiles }, () => {
          loadProfiles();
          showStatus('setup-status', 'Profile updated');
          setupForm.style.display = 'none';
          editProfileBtn.classList.remove('editing');
        });
      }
    }
  });


  // Reset configuration
  document.getElementById('reset-config').addEventListener('click', () => {
    chrome.storage.sync.clear(() => {
      document.getElementById('webhook-url').value = '';
      document.getElementById('username').value = '';
      document.getElementById('profile-name').value = '';
      profiles = [];
      currentProfileId = null;
      loadProfiles();
      showStatus('setup-status');
    });
  });


  // Share options behavior
  const shareOptions = document.querySelectorAll('.share-option');
  const urlShare = document.getElementById('url-share');
  const fileShare = document.getElementById('file-share');
  const clipboardShare = document.getElementById('clipboard-share');

  if (shareOptions && shareOptions.length > 0) {
    shareOptions.forEach(option => {
      if (option) {
        option.addEventListener('click', () => {
          shareOptions.forEach(opt => {
            if (opt) opt.classList.remove('active');
          });
          option.classList.add('active');

          const optionType = option.dataset.option;
          if (urlShare) urlShare.classList.toggle('active', optionType === 'url');
          if (fileShare) fileShare.classList.toggle('active', optionType === 'file');
          if (clipboardShare) clipboardShare.classList.toggle('active', optionType === 'clipboard');
        });
      }
    });

    // Set initial active option
    if (shareOptions[0]) shareOptions[0].click();
  }

  // Share link
  document.getElementById('share-link').addEventListener('click', () => {
    const url = document.getElementById('link-url').value.trim();
    const description = document.getElementById('link-description').value.trim();

    if (!url) {
      showError('share-error', 'Please enter a URL');
      return;
    }

    chrome.storage.sync.get(['profiles', 'currentProfileId'], (data) => {
      const profiles = data.profiles || [];
      const currentProfileId = data.currentProfileId;
      const currentProfile = profiles.find(p => p.id === currentProfileId);
      
      if (!currentProfile || !currentProfile.webhookUrl) {
        showError('share-error', 'Please set up webhook URL first');
        return;
      }

      let content = '';
      if (description) content += description + '\n';
      content += url;

      const payload = {
        username: currentProfile.username || 'Webhook Sender',
        content
      };

      fetch(currentProfile.webhookUrl, {
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

  if (dropArea && fileInput) {
    dropArea.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      if (dropArea) {
        dropArea.addEventListener(eventName, preventDefaults, false);
      }
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      if (dropArea) {
        dropArea.addEventListener(eventName, () => {
          dropArea.classList.add('active');
        });
      }
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      if (dropArea) {
        dropArea.addEventListener(eventName, () => {
          dropArea.classList.remove('active');
        });
      }
    });
  }

  if (dropArea) {
    dropArea.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      handleFiles(dt.files);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
    });
  }

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
  const uploadFilesBtn = document.getElementById('upload-files');
  if (uploadFilesBtn) {
    uploadFilesBtn.addEventListener('click', () => {
      if (selectedFiles.length === 0) {
        showError('upload-error', 'Please select files to upload');
        return;
      }

      chrome.storage.sync.get(['profiles', 'currentProfileId'], (data) => {
        const profiles = data.profiles || [];
        const currentProfileId = data.currentProfileId;
        const currentProfile = profiles.find(p => p.id === currentProfileId);
        
        if (!currentProfile || !currentProfile.webhookUrl) {
          showError('upload-error', 'Please set up webhook URL first');
          return;
        }

        const message = document.getElementById('message').value.trim();
        const formData = new FormData();
        const payload = {
          username: currentProfile.username || 'Webhook Sender',
          content: message || 'Uploaded files:'
        };
        formData.append('payload_json', JSON.stringify(payload));

        // Discord webhook expects each file to have a unique key
        selectedFiles.forEach((file, index) => {
          formData.append(`file${index}`, file); // Use unique key for each file
          const progressBar = fileList.children[index].querySelector('.progress-bar');
          progressBar.style.width = '50%';
        });

        fetch(currentProfile.webhookUrl, {
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
  }

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

  // Clipboard sharing functionality
  const clipboardShareOption = document.querySelector('[data-option="clipboard"]');
  const clipboardShareSection = document.getElementById('clipboard-share');
  const pasteArea = document.getElementById('paste-area');
  const clipboardPreview = document.getElementById('preview-area');
  const contentPreview = document.getElementById('content-preview');
  const shareClipboardButton = document.getElementById('share-clipboard');
  const clipboardStatus = document.getElementById('clipboard-status');
  const clipboardError = document.getElementById('clipboard-error');

  let clipboardContent = null;
  let clipboardType = null;

  if (clipboardShareOption) {
    clipboardShareOption.addEventListener('click', () => {
      document.querySelectorAll('.share-option').forEach(opt => opt.classList.remove('active'));
      document.querySelectorAll('.share-content > div').forEach(div => div.classList.remove('active'));
      clipboardShareOption.classList.add('active');
      if (clipboardShareSection) clipboardShareSection.classList.add('active');
    });
  }

  if (pasteArea) {
    pasteArea.addEventListener('click', async () => {
      try {
        // Request clipboard permission first
        const permissionResult = await navigator.permissions.query({ name: 'clipboard-read' });
        if (permissionResult.state === 'denied') {
          throw new Error('Clipboard permission denied');
        }
        const items = await navigator.clipboard.read();
      
        for (const item of items) {
          if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
            const blob = await item.getType(item.types.find(type => type.startsWith('image/')));
            clipboardContent = blob;
            clipboardType = 'image';
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(blob);
            img.style.maxWidth = '100%';
            img.style.borderRadius = '4px';
            
            if (contentPreview) {
              contentPreview.innerHTML = '';
              contentPreview.appendChild(img);
            }
            if (clipboardPreview) clipboardPreview.style.display = 'block';
            if (shareClipboardButton) shareClipboardButton.style.display = 'block';
            break;
          } else if (item.types.includes('text/plain')) {
            const text = await navigator.clipboard.readText();
            clipboardContent = text;
            clipboardType = 'text';
            
            if (contentPreview) {
              contentPreview.innerHTML = `<div class="file-item"><div class="file-info"><span class="file-name">${text.substring(0, 50)}${text.length > 50 ? '...' : ''}</span></div></div>`;
            }
            if (clipboardPreview) clipboardPreview.style.display = 'block';
            if (shareClipboardButton) shareClipboardButton.style.display = 'block';
            break;
          }
        }
      } catch (error) {
        if (clipboardError) {
          clipboardError.textContent = error.message === 'Clipboard permission denied' ?
            'Please allow clipboard access in your browser settings' : '';
          if(!clipboardError.textContent){
            clipboardError.textContent = 'Copied to ClipBoard';
          }
      
          clipboardError.style.display = 'block';
          setTimeout(() => {
            clipboardError.style.display = 'none';
          }, 3000);
        }
      }
    });
  }

  if (shareClipboardButton) {
    shareClipboardButton.addEventListener('click', async () => {
      chrome.storage.sync.get(['profiles', 'currentProfileId'], async (data) => {
        const profiles = data.profiles || [];
        const currentProfileId = data.currentProfileId;
        const currentProfile = profiles.find(p => p.id === currentProfileId);
        
        if (!currentProfile || !currentProfile.webhookUrl) {
          if (clipboardError) {
            clipboardError.textContent = 'Please set up webhook URL first';
            clipboardError.style.display = 'block';
          }
          return;
        }
    
        const formData = new FormData();
        const payload = {
          username: currentProfile.username || 'Webhook Sender',
          content: clipboardType === 'text' ? clipboardContent : 'Shared clipboard image:'
        };
    
        if (clipboardType === 'image') {
          formData.append('payload_json', JSON.stringify(payload));
          formData.append('files[]', clipboardContent, 'clipboard-image.png');
    
          try {
            const response = await fetch(currentProfile.webhookUrl, {
              method: 'POST',
              body: formData
            });
    
            if (!response.ok) throw new Error('Failed to send image');
            
            if (clipboardStatus) {
              clipboardStatus.style.display = 'block';
              setTimeout(() => {
                clipboardStatus.style.display = 'none';
                if (clipboardPreview) clipboardPreview.style.display = 'none';
                if (shareClipboardButton) shareClipboardButton.style.display = 'none';
                clipboardContent = null;
                clipboardType = null;
              }, 3000);
            }
          } catch (error) {
            if (clipboardError) {
              clipboardError.textContent = 'Failed to share image';
              clipboardError.style.display = 'block';
              setTimeout(() => {
                clipboardError.style.display = 'none';
              }, 3000);
            }
          }
        } else if (clipboardType === 'text') {
          try {
            const response = await fetch(currentProfile.webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
    
            if (!response.ok) throw new Error('Failed to send text');
    
            if (clipboardStatus) {
              clipboardStatus.style.display = 'block';
              setTimeout(() => {
                clipboardStatus.style.display = 'none';
                if (clipboardPreview) clipboardPreview.style.display = 'none';
                if (shareClipboardButton) shareClipboardButton.style.display = 'none';
                clipboardContent = null;
                clipboardType = null;
              }, 3000);
            }
          } catch (error) {
            if (clipboardError) {
              clipboardError.textContent = 'Failed to share text';
              clipboardError.style.display = 'block';
              setTimeout(() => {
                clipboardError.style.display = 'none';
              }, 3000);
            }
          }
        }
      });
    });
  }
});