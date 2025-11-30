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

    <div>下次休息的时间</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const workMin = ref(30);
const breakMin = ref(5);
const autoLaunch = ref(true);

function save() {
  // @ts-ignore
  window.configAPI?.update({
    workMin: workMin.value,
    breakMin: breakMin.value,
    autoLaunch: autoLaunch.value
  });
  console.log('window.configAPI?.update', window.configAPI?.update)
  alert('设置已保存');
}

onMounted(async () => {
  const cfg = await window.configAPI?.get();
  if (cfg) {
    workMin.value = cfg.workMin;
    breakMin.value = cfg.breakMin;
    autoLaunch.value = cfg.autoLaunch;
  }
});
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
</style>
