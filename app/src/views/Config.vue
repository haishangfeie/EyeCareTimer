<template>
  <div class="settings-card">
    <h2 class="settings-title">护眼时光设置</h2>

    <div class="form-group">
      <label class="form-label">
        工作时长（分钟）
        <input type="number" class="form-input" v-model.number="workMin" min="5" />
      </label>
    </div>

    <div class="form-group">
      <label class="form-label">
        休息时长（分钟）
        <input type="number" class="form-input" v-model.number="breakMin" min="1" />
      </label>
    </div>

    <div class="form-group checkbox-group">
      <label class="form-label checkbox-label">
        <input type="checkbox" class="form-checkbox" v-model="autoLaunch" />
        <span>开机自启动</span>
      </label>
    </div>

    <button class="btn-primary" @click="save">保存设置</button>

    <div class="rest-card">
      <div class="rest-header">
        <i class="icon-clock"></i> 下次休息时间
      </div>
      <div class="rest-body">
        <span class="time-text">{{ nextRestTimeText }}</span>
      </div>
      <div class="rest-footer">
        距离休息还有：<span class="countdown-text">{{ remainingTime }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';

const workMin = ref(30);
const breakMin = ref(5);
const autoLaunch = ref(true);

const nextRestTime = ref<number | null>(null);
const remainingTime = ref('');

function save() {
  // @ts-ignore
  window.configAPI?.update({
    workMin: workMin.value,
    breakMin: breakMin.value,
    autoLaunch: autoLaunch.value
  });
  alert('设置已保存');
}
let timer: number | null = null;
onMounted(async () => {
  const cfg = await window.configAPI?.get();
  if (cfg) {
    workMin.value = cfg.workMin;
    breakMin.value = cfg.breakMin;
    autoLaunch.value = cfg.autoLaunch;
    nextRestTime.value = cfg.nextBreakTime;
  }
  window.configAPI.onNextRestTime((time) => {
    nextRestTime.value = time;
  });

  const fn = () => {
    if (nextRestTime.value) {
      const diff = nextRestTime.value - Date.now();
      if (diff > 0) {
        remainingTime.value = formatDiff(diff);
      } else {
        remainingTime.value = '已到休息时间';
      }
    }
  }
  fn()
  // 每秒刷新倒计时
  timer = setInterval(() => {
    fn()
  }, 1000);
});

// 组件卸载时清理定时器
onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});

function formatDiff(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}时${minutes.toString().padStart(2, '0')}分${seconds.toString().padStart(2, '0')}秒`;
}

const nextRestTimeText = computed(() => {
  if (!nextRestTime.value) {
    return ''
  }
  return formatTimestamp(nextRestTime.value).standard
});
function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // 返回两种格式
  return {
    standard: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
    chinese: `${year}年${month}月${day}日 ${hours}时${minutes}分${seconds}秒`
  };
}
</script>

<style>
.settings-card {
  max-width: 400px;
  margin: 40px auto;
  padding: 20px 25px;
  background: #ffffff;
  border-radius: 10px;
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
}

.settings-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
  color: #333;
}

.form-group {
  margin-bottom: 15px;
}

/* 针对复选框的 label 单独处理 */
.checkbox-label {
  display: flex;
  align-items: center;
  /* 垂直居中对齐 */
  font-size: 14px;
  color: #555;
}

/* 复选框和文字间距 */
.form-checkbox {
  margin-right: 8px;
  margin-top: 0;
  margin-bottom: 0;
}

.form-label {
  display: flex;
  font-size: 14px;
  color: #555;
  align-items: center;
}

.form-input {
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #4cafef;
  outline: none;
}

.checkbox-group {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.btn-primary {
  width: 100%;
  padding: 10px;
  background: #4cafef;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-primary:hover {
  background: #3a9bdc;
}
.rest-card {
  background: #f5fdf5;
  /* 淡绿色护眼背景 */
  border: 1px solid #c8e6c9;
  border-radius: 8px;
  padding: 15px;
  margin-top: 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.rest-header {
  font-size: 14px;
  font-weight: bold;
  color: #2e7d32;
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.rest-header .icon-clock {
  margin-right: 6px;
  color: #4caf50;
}

.rest-body .time-text {
  font-family: 'Courier New', monospace;
  font-size: 16px;
  background: #e8f5e9;
  padding: 4px 8px;
  border-radius: 4px;
}

.rest-footer {
  margin-top: 10px;
  font-size: 14px;
  color: #555;
}

.countdown-text {
  font-weight: bold;
  color: #d32f2f;
  /* 红色强调倒计时 */
}
</style>
