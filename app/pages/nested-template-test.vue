<template>
  <div class="container py-4">
    <h1 class="mb-4">중첩 template 태그 테스트</h1>

    <h2 class="h5 mb-2">v-for</h2>
    <ul class="mb-4">
      <template v-for="item in items" :key="item.id">
        <li>{{ item.name }}</li>
      </template>
    </ul>

    <h2 class="h5 mb-2">v-if / v-else</h2>
    <div class="mb-4">
      <template v-if="show">
        <p class="text-success">보임</p>
      </template>
      <template v-else>
        <p class="text-danger">숨김</p>
      </template>
      <button class="btn btn-sm btn-secondary" @click="show = !show">토글</button>
    </div>

    <h2 class="h5 mb-2">중첩 v-for + v-if</h2>
    <ul class="mb-4">
      <template v-for="item in items" :key="item.id">
        <template v-if="item.active">
          <li class="text-success">{{ item.name }} (활성)</li>
        </template>
      </template>
    </ul>

    <p class="text-success fw-bold" v-if="ok">✓ 파싱 성공 — 중첩 template 태그 정상 작동</p>
  </div>
</template>

<script>
export default {
  auth: false,
  title: '중첩 template 테스트',
  data() {
    return {
      ok: true,
      show: true,
      items: [
        { id: 1, name: 'Apple', active: true },
        { id: 2, name: 'Banana', active: false },
        { id: 3, name: 'Cherry', active: true },
      ]
    }
  }
}
</script>
