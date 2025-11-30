<template>
  <div class="overlay">
    <h1>休息一下 👀</h1>
    <p class="count">{{ mm }}:{{ ss }}</p>
    <div class="actions">
      <button @click="skip">跳过休息</button>
      <button @click="prepare">休息前准备</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const remainingMs = ref(0);
let timer: number | null = null;

const mm = computed(() =>
  String(Math.floor(remainingMs.value / 60000)).padStart(2, '0')
);
const ss = computed(() =>
  String(Math.floor((remainingMs.value % 60000) / 1000)).padStart(2, '0')
);

function skip() {
  window.breakAPI?.close();
}

function prepare() {
  window.breakAPI?.prepare();
}

onMounted(async () => {
  // 1. 从配置里读取休息分钟数
  const config = await window.configAPI?.get?.();
  const breakMin = config?.breakMin ?? 5; // 默认 5 分钟
  const totalMs = breakMin * 60_000;

  const start = Date.now();
  remainingMs.value = totalMs;

  // 2. 启动定时器
  timer = window.setInterval(() => {
    const elapsed = Date.now() - start;
    remainingMs.value = Math.max(0, totalMs - elapsed);

    // 3. 倒计时为 0 时清除定时器并关闭页面
    if (remainingMs.value <= 0) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      window.breakAPI?.close();
    }
  }, 1000);
});

onUnmounted(() => {
  // 4. 页面销毁时清除定时器
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>

<style>
@font-face {
  font-family: 'digital-7 (mono)';
  src: url('/digital-7 (mono).ttf') format('truetype');
}

.overlay {
  position: fixed;
  inset: 0;
  background: #111;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.count {
  font-size: 80px;
  margin: 20px 0;
  font-family: 'digital-7 (mono)', monospace;
  letter-spacing: 2px;
}

.actions {
  display: flex;
  gap: 12px;
}

button {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
