import { generateUserId } from '../../utils';
import type { UserProfile } from '../../types';

Page({
  data: {
    avatarUrl: '',
    nickname: '',
    uploading: false
  },

  /**
   * 选择头像 - 官方头像昵称填写组件
   */
  async onChooseAvatar(e: any) {
    const { avatarUrl } = e.detail;
    console.log('Avatar selected:', avatarUrl);

    // 检查是否是临时文件路径
    if (avatarUrl.startsWith('http://tmp/') || avatarUrl.startsWith('wxfile://tmp') || avatarUrl.includes('__tmp__')) {
      console.log('检测到临时文件路径，正在上传到云存储...');
      this.setData({ uploading: true });

      try {
        // 上传头像到云存储
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
          filePath: avatarUrl
        });

        console.log('头像上传成功，云存储URL:', uploadResult.fileID);

        // 使用云存储URL
        this.setData({ avatarUrl: uploadResult.fileID, uploading: false });

        wx.showToast({
          title: '头像上传成功',
          icon: 'success',
          duration: 1000
        });
      } catch (error) {
        console.error('头像上传失败:', error);
        this.setData({ uploading: false });
        wx.showToast({
          title: '头像上传失败',
          icon: 'none'
        });
      }
    } else {
      // 已经是云存储URL或网络URL
      this.setData({ avatarUrl });
    }
  },

  /**
   * 昵称输入框失去焦点 - 官方头像昵称填写组件
   */
  onNicknameBlur(e: any) {
    const nickname = e.detail.value;
    console.log('Nickname blur:', nickname);
    this.setData({ nickname });
  },

  /**
   * 确认登录
   */
  handleLogin() {
    const { avatarUrl, nickname } = this.data;

    // 验证昵称
    if (!nickname || nickname.trim().length === 0) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none',
      });
      return;
    }

    // 验证头像
    if (!avatarUrl) {
      wx.showToast({
        title: '请选择头像',
        icon: 'none',
      });
      return;
    }

    // 创建用户对象
    const user: UserProfile = {
      id: generateUserId(),
      name: nickname.trim(),
      avatarUrl: avatarUrl
    };

    // 保存用户信息到全局数据
    const app = getApp();
    app.saveUser(user);

    wx.showToast({
      title: '登录成功',
      icon: 'success',
    });

    // 延迟跳转到房间页面
    setTimeout(() => {
      wx.redirectTo({
        url: '/pages/room/room',
      });
    }, 500);
  }
});
