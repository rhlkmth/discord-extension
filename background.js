chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({
      id: 'share-link',
      title: 'Share Link to Discord',
      contexts: ['link', 'page']
    });

    chrome.contextMenus.create({
      id: 'share-image',
      title: 'Share Image to Discord',
      contexts: ['image']
    });
    
    console.log('Context menus created successfully');
  } catch (error) {
    console.error('Error creating context menus:', error);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
  
  chrome.storage.sync.get(['profiles', 'currentProfileId'], (data) => {
    const profiles = data.profiles || [];
    const currentProfileId = data.currentProfileId;
    const currentProfile = profiles.find(p => p.id === currentProfileId);
    
    console.log('Current profile:', currentProfile ? 'found' : 'not found');
    
    if (!currentProfile || !currentProfile.webhookUrl) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Discord Webhook Sender',
        message: 'Please set up webhook URL first'
      });
      return;
    }

    if (info.menuItemId === 'share-link') {
      const url = info.linkUrl || info.pageUrl;
      const payload = {
        username: currentProfile.username || 'Webhook Sender',
        content: url
      };

      fetch(currentProfile.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Discord Webhook Sender',
          message: 'Link shared successfully!'
        });
      })
      .catch(error => {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Discord Webhook Sender',
          message: 'Failed to share link'
        });
      });
    } else if (info.menuItemId === 'share-image') {
      const formData = new FormData();
      const payload = {
        username: currentProfile.username || 'Webhook Sender',
        content: 'Shared image:'
      };
      formData.append('payload_json', JSON.stringify(payload));

      fetch(info.srcUrl)
        .then(response => response.blob())
        .then(blob => {
          formData.append('files[]', blob, 'image.png');
          return fetch(currentProfile.webhookUrl, {
            method: 'POST',
            body: formData
          });
        })
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Discord Webhook Sender',
            message: 'Image shared successfully!'
          });
        })
        .catch(error => {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Discord Webhook Sender',
            message: 'Failed to share image'
          });
        });
    }
  });
});