<template>
  <div class="d-flex flex-column align-items-center justify-content-center text-center min-vh-60">
    <h1 class="display-1 fw-bold text-muted">오류</h1>
    <p class="text-muted mb-4">문제가 발생했습니다</p>
    <router-link to="/" class="btn btn-outline-secondary btn-sm">홈으로 돌아가기</router-link>
  </div>
</template>

<script>
export default {
  auth: false,
}
</script>
