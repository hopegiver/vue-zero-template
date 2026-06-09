<template>
  <div>
    <!-- Page title -->
    <h1 class="h4 mt-0 mb-1 fw-bold">대시보드</h1>
    <p class="text-faint small mb-4">안녕하세요, 관리자님. 오늘의 현황입니다.</p>

    <!-- Notification banners -->
    <div class="d-flex flex-column gap-2 mb-4">
      <div v-for="(noti, i) in notifications" :key="i"
           class="admin-noti d-flex align-items-center gap-2 gap-lg-3 px-3 px-lg-4 py-2 py-lg-3 rounded-pill-lg"
           :class="'admin-noti--' + noti.type">
        <span class="admin-noti-icon d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" :class="'admin-noti-icon--' + noti.type">
          <span v-if="noti.type === 'info'">&#9201;</span>
          <span v-else-if="noti.type === 'success'">&#10004;</span>
          <span v-else>&#9888;</span>
        </span>
        <div class="flex-grow-1">
          <div class="fw-bold small">{{ noti.title }}</div>
          <div class="text-faint" style="font-size: 0.75rem;">{{ noti.time }}</div>
        </div>
        <button class="btn-close btn-close-sm" @click="removeNoti(i)"></button>
      </div>
    </div>

    <!-- Stats cards -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-lg-3" v-for="stat in stats" :key="stat.label">
        <div class="card p-3 d-flex flex-row align-items-center gap-3 h-100">
          <div class="flex-grow-1">
            <div class="text-faint small mb-1">{{ stat.label }}</div>
            <div class="fs-3 fw-bold">{{ stat.value }}</div>
            <div class="d-flex align-items-center gap-1 mt-1">
              <span class="admin-trend" :class="stat.up ? 'admin-trend--up' : 'admin-trend--down'">
                <svg v-if="stat.up" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
                <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>
              </span>
              <span class="small" :class="stat.up ? 'admin-trend--up' : 'admin-trend--down'">{{ stat.change }}</span>
            </div>
          </div>
          <div class="admin-stat-icon d-flex align-items-center justify-content-center rounded-pill-lg" :class="'admin-stat-icon--' + stat.color">
            <span style="font-size: 1.25rem;">{{ stat.icon }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts and Recent reports row -->
    <div class="row g-3">
      <!-- Monthly chart -->
      <div class="col-lg-7">
        <div class="card p-4 h-100">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h2 class="h6 mb-0 fw-bold">월별 리포트 현황</h2>
            <span class="text-faint small">최근 6개월</span>
          </div>
          <div class="admin-chart d-flex align-items-end gap-2" style="height: 200px;">
            <div v-for="bar in chartData" :key="bar.month" class="admin-chart-bar-wrap d-flex flex-column align-items-center flex-grow-1 h-100 justify-content-end">
              <span class="small fw-bold mb-1">{{ bar.value }}</span>
              <div class="admin-chart-bar rounded-pill-lg" :style="{ height: (bar.value / maxChart * 100) + '%' }"></div>
              <span class="text-faint mt-1" style="font-size: 0.75rem;">{{ bar.month }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent reports -->
      <div class="col-lg-5">
        <div class="card p-4 h-100">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h2 class="h6 mb-0 fw-bold">최근 리포트</h2>
            <a href="#" class="small text-decoration-none d-flex align-items-center gap-1" @click.prevent>
              전체 보기
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          </div>
          <div class="d-flex flex-column gap-3">
            <div v-for="report in recentReports" :key="report.title" class="d-flex align-items-center gap-3">
              <div class="admin-report-icon d-flex align-items-center justify-content-center rounded-pill-lg flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div class="flex-grow-1" style="min-width: 0;">
                <div class="fw-bold small text-truncate">{{ report.title }}</div>
                <div class="text-faint" style="font-size: 0.75rem;">{{ report.author }} &middot; {{ report.date }}</div>
              </div>
              <span class="admin-status-badge" :class="'admin-status--' + report.status">{{ report.statusText }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  layout: 'admin',
  title: '관리자 대시보드',
  data() {
    return {
      notifications: [
        { type: 'info', title: '4월 월간 리포트 마감일이 3일 남았습니다.', time: '방금 전' },
        { type: 'success', title: 'Q1 2025 Moby Read 분석 리포트가 완료되었습니다.', time: '1시간 전' },
        { type: 'warning', title: '사용자 성장 Q2 리포트 검토 요청이 있습니다.', time: '3시간 전' },
      ],
      stats: [
        { label: '전체 리포트', value: '1,284', change: '+12% 전월 대비', up: true, icon: '📋', color: 'blue' },
        { label: '활성 사용자', value: '342', change: '+8% 전월 대비', up: true, icon: '👥', color: 'green' },
        { label: '이번 달', value: '186', change: '+23% 전월 대비', up: true, icon: '📅', color: 'orange' },
        { label: '완료율', value: '94.2%', change: '+2.1% 전월 대비', up: true, icon: '✅', color: 'purple' },
      ],
      chartData: [
        { month: '11월', value: 98 },
        { month: '12월', value: 112 },
        { month: '1월', value: 87 },
        { month: '2월', value: 134 },
        { month: '3월', value: 121 },
        { month: '4월', value: 186 },
      ],
      recentReports: [
        { title: 'Q1 2025 Moby Read 분석', author: 'Alice Kim', date: '2025-04-15', status: 'done', statusText: '완료' },
        { title: '4월 ECC Progress 요약', author: 'Bob Chen', date: '2025-04-14', status: 'progress', statusText: '진행 중' },
        { title: '사용자 성장 Q2 분석', author: 'Carol Lee', date: '2025-04-13', status: 'review', statusText: '검토 중' },
        { title: '리텐션 RSA 분석', author: 'David Park', date: '2025-04-12', status: 'done', statusText: '완료' },
        { title: 'YEPT 주간 다이제스트 #18', author: 'Emma Wilson', date: '2025-04-11', status: 'progress', statusText: '진행 중' },
      ],
    }
  },
  computed: {
    maxChart() {
      return Math.max(...this.chartData.map(d => d.value))
    }
  },
  methods: {
    removeNoti(index) {
      this.notifications.splice(index, 1)
    }
  }
}
</script>

<style>
/* ── Dashboard styles ── */

/* Notifications */
.admin-noti {
  border: 1px solid;
}
.admin-noti--info {
  background-color: #f0f7ff;
  border-color: #d0e3f7;
}
.admin-noti--success {
  background-color: #f0faf0;
  border-color: #c8ecc8;
}
.admin-noti--warning {
  background-color: #fffbf0;
  border-color: #f5e6c0;
}
.admin-noti-icon {
  width: 28px;
  height: 28px;
  font-size: 0.875rem;
}
.admin-noti-icon--info { background-color: #dbeafe; color: var(--color-primary); }
.admin-noti-icon--success { background-color: #d1fae5; color: var(--color-accent-green); }
.admin-noti-icon--warning { background-color: #fef3c7; color: var(--color-accent-orange); }

/* Stat cards */
.admin-stat-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}
.admin-stat-icon--blue { background-color: #eef4ff; }
.admin-stat-icon--green { background-color: #ecfdf5; }
.admin-stat-icon--orange { background-color: #fff7ed; }
.admin-stat-icon--purple { background-color: #f3f0ff; }

.admin-trend--up { color: var(--color-accent-green); }
.admin-trend--down { color: #ef4444; }

/* Chart */
.admin-chart-bar {
  width: 100%;
  max-width: 60px;
  background-color: var(--color-primary);
  min-height: 4px;
  transition: height 0.3s;
}

/* Report icons */
.admin-report-icon {
  width: 36px;
  height: 36px;
  background-color: #eef4ff;
}

/* Status badges */
.admin-status-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: var(--rounded-full);
  white-space: nowrap;
}
.admin-status--done {
  background-color: #d1fae5;
  color: #065f46;
}
.admin-status--progress {
  background-color: #dbeafe;
  color: #1e40af;
}
.admin-status--review {
  background-color: #fef3c7;
  color: #92400e;
}
</style>
