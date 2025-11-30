import { createRouter, createWebHashHistory } from 'vue-router';
import Config from './views/Config.vue';
import Break from './views/Break.vue';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: Config,
      meta: {
        title: '配置',
      },
    }, // 配置页面
    { path: '/break', component: Break }, // 屏保页面
  ],
});

router.afterEach((to) => {
  document.title = to.meta.title || '护眼时光';
});