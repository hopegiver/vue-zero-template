<template>
  <div class="container py-4">
    <h1 class="mb-3">대시보드</h1>
    <p v-if="loading" class="text-muted">불러오는 중...</p>
    <div v-else>
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3" v-for="stat in stats" :key="stat.label">
          <div class="card p-3 text-center">
            <div class="fs-4 fw-bold">{{ stat.value }}</div>
            <div class="text-faint small">{{ stat.label }}</div>
            <div class="small fw-bold" :class="stat.trend === 'up' ? 'text-success' : 'text-danger'">{{ stat.change }}</div>
          </div>
        </div>
      </div>
      <div class="row g-3">
        <div class="col-md-6">
          <div class="card p-3">
            <h2 class="h6 mb-3">최근 활동</h2>
            <div class="d-flex flex-column gap-2">
              <div v-for="user in activeUsers" :key="user.name"
                class="d-flex align-items-center gap-3 p-3 bg-canvas rounded-2 border border-hairline user-card-hover"
                role="button" @click="selectedUser = user.name">
                <div class="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0 user-card-avatar"
                     :style="{ background: user.color }">{{ user.name.slice(0, 1) }}</div>
                <div>
                  <strong class="d-block small">{{ user.name }}</strong>
                  <span class="text-faint text-eyebrow">{{ user.role }}</span>
                </div>
              </div>
            </div>
            <p v-if="selectedUser" class="mt-2 mb-0 small fw-bold text-primary">선택: {{ selectedUser }}</p>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card p-3">
            <h2 class="h6 mb-3">알림 {{ unreadCount > 0 ? '(' + unreadCount + ')' : '' }}</h2>
            <ul class="list-unstyled mb-2">
              <li v-for="notification in notifications" :key="notification.id"
                  class="py-2 border-bottom small"
                  :class="{ 'fw-bold': !notification.read }"
                  role="button"
                  @click="markRead(notification)">
                {{ notification.text }}
              </li>
            </ul>
            <AppButton v-if="unreadCount > 0" @click="markAllRead">모두 읽음</AppButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  title: '대시보드',
  data() {
    return {
      loading: true,
      selectedUser: null,
      stats: [],
      activeUsers: [],
      notifications: [],
    }
  },
  async mounted() {
    try {
      const res = await fetch('/api/stats/dashboard')
      if (!res.ok) throw new Error()
      const data = await res.json()
      this.stats = data.stats
      this.activeUsers = data.activeUsers
      this.notifications = data.notifications
    } catch {
      this.stats = []
    } finally {
      this.loading = false
    }
  },
  computed: {
    unreadCount() {
      return this.notifications.filter(n => !n.read).length
    }
  },
  methods: {
    markRead(notification) {
      notification.read = true
    },
    markAllRead() {
      this.notifications.forEach(n => { n.read = true })
    }
  }
}
</script>

<style>
.user-card-hover { cursor: pointer; transition: box-shadow 0.15s; }
.user-card-hover:hover { box-shadow: var(--shadow-soft); }
.user-card-avatar { width: 36px; height: 36px; font-size: 0.875rem; }
</style>
