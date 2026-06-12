<template>
  <div class="admin-wrap d-flex min-vh-100">
    <!-- Mobile overlay -->
    <div v-if="isSidebarOpen" class="admin-sidebar-overlay" @click="isSidebarOpen = false"></div>

    <!-- Sidebar -->
    <aside class="admin-sidebar d-flex flex-column flex-shrink-0" :class="{ open: isSidebarOpen }">
      <!-- Logo — same height as header -->
      <div class="admin-sidebar-logo d-flex align-items-center gap-2 px-3">
        <div class="admin-logo-icon d-flex align-items-center justify-content-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="var(--color-primary)"/>
            <path d="M7 8h10M7 12h10M7 16h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <span class="fw-bold" style="font-size: 0.9375rem;">Malgn Report</span>
        <!-- Mobile close button -->
        <button class="admin-sidebar-close ms-auto admin-icon-btn d-lg-none" @click="isSidebarOpen = false">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Navigation (scrollable) -->
      <nav class="admin-nav flex-grow-1 px-2 py-2" style="overflow-y: auto;">
        <router-link to="/admin" class="admin-nav-item" :class="{ 'is-active': $route.path === '/admin' }" @click="closeSidebarOnMobile">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          대시보드
        </router-link>

        <!-- 리포트 섹션 -->
        <div class="admin-nav-group">
          <div class="admin-nav-item" :class="{ 'is-open': isReportPage }" @click="isReportOpen = !isReportOpen" style="cursor:pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            리포트
            <svg class="ms-auto admin-chevron" :class="{ open: isReportOpen }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div v-if="isReportOpen" class="admin-nav-sub">
            <router-link to="/admin/members" class="admin-nav-item sub" :class="{ 'is-active': $route.path === '/admin/members' }" @click="closeSidebarOnMobile">Moby Read 리포트</router-link>
            <a href="#" class="admin-nav-item sub" @click.prevent>Ecc Progress 리포트</a>
            <a href="#" class="admin-nav-item sub" @click.prevent>Online Scores 리포트</a>
            <a href="#" class="admin-nav-item sub" @click.prevent>RSA 리포트</a>
            <a href="#" class="admin-nav-item sub" @click.prevent>YEPT 리포트</a>
          </div>
        </div>

        <a href="#" class="admin-nav-item" @click.prevent>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          AI 리포트 상담
        </a>

        <a href="#" class="admin-nav-item" @click.prevent>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          설정
        </a>
      </nav>

      <!-- User profile at bottom -->
      <div class="admin-sidebar-user d-flex align-items-center gap-2 px-3 py-3 border-top border-hairline">
        <div class="admin-avatar d-flex align-items-center justify-content-center rounded-circle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div class="d-flex flex-column" style="line-height: 1.2;">
          <span class="small fw-bold">관리자</span>
          <span class="admin-user-email">admin@malgnsoft.com</span>
        </div>
        <a href="#" class="ms-auto text-decoration-none admin-logout-btn" title="로그아웃" @click.prevent="logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </a>
      </div>
    </aside>

    <!-- Spacer for fixed sidebar (desktop only) -->
    <div class="admin-sidebar-spacer flex-shrink-0 d-none d-lg-block"></div>

    <!-- Main content area -->
    <div class="d-flex flex-column flex-grow-1" style="min-height: 100vh; min-width: 0;">
      <!-- Top header (sticky) -->
      <header class="admin-header d-flex align-items-center px-3 px-lg-4 border-bottom border-hairline bg-canvas">
        <!-- Mobile hamburger -->
        <button class="admin-icon-btn d-lg-none me-2" @click="isSidebarOpen = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div class="admin-search d-flex align-items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="admin-search-input" placeholder="학생 이름 검색..." />
        </div>
        <div class="d-flex align-items-center gap-3 ms-auto">
          <button class="admin-icon-btn" title="테마 변경">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          </button>
          <div class="admin-user-menu position-relative">
            <button class="d-flex align-items-center gap-2 admin-user-menu-btn" @click="isUserMenuOpen = !isUserMenuOpen">
              <div class="admin-avatar-sm d-flex align-items-center justify-content-center rounded-circle">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <span class="small fw-bold d-none d-sm-inline">관리자</span>
              <svg class="admin-chevron d-none d-sm-block" :class="{ open: isUserMenuOpen }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div v-if="isUserMenuOpen" class="admin-dropdown">
              <div class="px-3 py-2 border-bottom border-hairline">
                <div class="small fw-bold">관리자</div>
                <div class="admin-user-email">admin@malgnsoft.com</div>
              </div>
              <a href="#" class="admin-dropdown-item" @click.prevent>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                내 프로필
              </a>
              <a href="#" class="admin-dropdown-item" @click.prevent>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                설정
              </a>
              <div class="border-top border-hairline"></div>
              <a href="#" class="admin-dropdown-item admin-dropdown-item--danger" @click.prevent="logout">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                로그아웃
              </a>
            </div>
            <div v-if="isUserMenuOpen" class="admin-dropdown-backdrop" @click="isUserMenuOpen = false"></div>
          </div>
        </div>
      </header>

      <!-- Page content (scrollable) -->
      <main class="flex-grow-1 p-3 p-lg-4 bg-canvas-soft">
        <slot />
      </main>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isReportOpen: true,
      isUserMenuOpen: false,
      isSidebarOpen: false
    }
  },
  computed: {
    isReportPage() {
      return this.$route.path.startsWith('/admin/members')
    }
  },
  methods: {
    closeSidebarOnMobile() {
      if (window.innerWidth < 992) {
        this.isSidebarOpen = false
      }
    },
    logout() {
      localStorage.removeItem('token')
      this.$router.push('/login')
    }
  }
}
</script>

<style>
/* ── Admin Layout ── */

:root {
  --admin-header-h: 52px;
  --admin-sidebar-w: 220px;
}

.admin-wrap {
  font-size: 0.9375rem;
}

/* Sidebar — fixed left, hidden on mobile */
.admin-sidebar {
  width: var(--admin-sidebar-w);
  background-color: var(--color-canvas);
  border-right: 1px solid var(--color-hairline);
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  transition: transform 0.25s ease;
}

/* Spacer pushes main content right (desktop) */
.admin-sidebar-spacer {
  width: var(--admin-sidebar-w);
}

/* Mobile: sidebar off-screen by default */
@media (max-width: 991.98px) {
  .admin-sidebar {
    transform: translateX(-100%);
  }
  .admin-sidebar.open {
    transform: translateX(0);
  }
}

/* Sidebar overlay (mobile) */
.admin-sidebar-overlay {
  display: none;
}
@media (max-width: 991.98px) {
  .admin-sidebar-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 99;
  }
}

/* Logo area — matches header height */
.admin-sidebar-logo {
  height: var(--admin-header-h);
  border-bottom: 1px solid var(--color-hairline);
  flex-shrink: 0;
}

.admin-logo-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--rounded-md);
}

/* Header — sticky top */
.admin-header {
  height: var(--admin-header-h);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 90;
}

/* Search — responsive width */
.admin-search {
  background-color: var(--color-canvas-soft);
  border-radius: var(--rounded-md);
  padding: 0.375rem 0.75rem;
  width: 280px;
  max-width: 100%;
}
@media (max-width: 575.98px) {
  .admin-search {
    width: 140px;
  }
}

/* Navigation */
.admin-nav-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--rounded-md);
  color: var(--color-ink-muted);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s;
  user-select: none;
}
.admin-nav-item:hover {
  background-color: var(--color-canvas-soft);
  color: var(--color-ink);
}
.admin-nav-item.is-active {
  background-color: #eef4ff;
  color: var(--color-primary);
  font-weight: 600;
}
.admin-nav-item.is-open {
  color: var(--color-ink);
  font-weight: 600;
}
.admin-nav-item.sub {
  padding-left: 2.5rem;
  font-size: 0.8125rem;
}
.admin-nav-sub {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.admin-chevron {
  transition: transform 0.2s;
}
.admin-chevron.open {
  transform: rotate(180deg);
}
.admin-nav-group {
  display: flex;
  flex-direction: column;
}

/* User section */
.admin-sidebar-user {
  background-color: var(--color-canvas);
}
.admin-avatar {
  width: 32px;
  height: 32px;
  background-color: var(--color-canvas-soft);
  color: var(--color-ink-muted);
  flex-shrink: 0;
}
.admin-avatar-sm {
  width: 28px;
  height: 28px;
  background-color: var(--color-primary);
  flex-shrink: 0;
}
.admin-user-email {
  font-size: 0.6875rem;
  color: var(--color-ink-faint);
}
.admin-logout-btn {
  color: var(--color-ink-faint);
  transition: color 0.15s;
}
.admin-logout-btn:hover {
  color: var(--color-ink);
}

.admin-search-input {
  border: none;
  background: none;
  outline: none;
  font-size: 0.875rem;
  color: var(--color-ink);
  width: 100%;
}
.admin-search-input::placeholder {
  color: var(--color-ink-faint);
}
.admin-icon-btn {
  background: none;
  border: none;
  color: var(--color-ink-muted);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--rounded-sm);
  transition: color 0.15s;
}
.admin-icon-btn:hover {
  color: var(--color-ink);
}

/* User menu button */
.admin-user-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--rounded-md);
  transition: background-color 0.15s;
}
.admin-user-menu-btn:hover {
  background-color: var(--color-canvas-soft);
}

/* Dropdown */
.admin-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 200px;
  background-color: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-elevated);
  z-index: 200;
  overflow: hidden;
}
.admin-dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-ink-muted);
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s;
}
.admin-dropdown-item:hover {
  background-color: var(--color-canvas-soft);
  color: var(--color-ink);
}
.admin-dropdown-item--danger {
  color: #dc2626;
}
.admin-dropdown-item--danger:hover {
  background-color: #fef2f2;
  color: #dc2626;
}

/* Invisible backdrop to close dropdown */
.admin-dropdown-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 199;
}
</style>
