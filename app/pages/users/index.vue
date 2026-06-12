<template>
  <div class="container py-4">
    <h1 class="mb-3">Users</h1>
    <p v-if="loading" class="text-muted">불러오는 중...</p>
    <p v-else-if="error" class="text-danger small">{{ error }}</p>
    <div v-else class="card overflow-hidden mb-3">
      <ul class="list-unstyled mb-0">
        <li v-for="user in users" :key="user.id" class="d-flex align-items-center gap-2 px-3 py-2 border-bottom">
          <router-link :to="'/users/' + user.id">{{ user.name }}</router-link>
          <span class="text-faint small ms-auto">{{ user.email }}</span>
        </li>
      </ul>
    </div>
    <router-link to="/" class="small">← Home</router-link>
  </div>
</template>

<script>
export default {
  data() {
    return {
      users: [],
      loading: true,
      error: null,
    }
  },
  async mounted() {
    const { data, error } = await useApi('/api/users')
    if (error) { this.error = '유저 목록을 불러오지 못했습니다.'; this.loading = false; return }
    this.users = data.users
    this.loading = false
  }
}
</script>
