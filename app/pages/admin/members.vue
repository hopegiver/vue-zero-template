<template>
  <div>
    <h1 class="h4 mt-0 mb-1 fw-bold">Moby Read 리포트</h1>
    <p class="text-faint small mb-4">학생별 Moby Read AI 리포트를 조회합니다.</p>

    <!-- Filters -->
    <div class="admin-filter-bar d-flex flex-wrap align-items-end gap-2 gap-lg-3 p-3 mb-3 rounded-pill-lg">
      <div class="admin-filter-field">
        <label class="form-label">Academy</label>
        <select v-model="filters.academy" class="form-select form-select-sm">
          <option value="">전체</option>
          <option v-for="a in academyOptions" :key="a" :value="a">{{ a }}</option>
        </select>
      </div>
      <div class="admin-filter-field">
        <label class="form-label">Curriculum</label>
        <select v-model="filters.curriculum" class="form-select form-select-sm">
          <option value="">전체</option>
          <option v-for="c in curriculumOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="admin-filter-field admin-filter-field--sm">
        <label class="form-label">Level</label>
        <select v-model="filters.level" class="form-select form-select-sm">
          <option value="">전체</option>
          <option v-for="l in levelOptions" :key="l" :value="l">{{ l }}</option>
        </select>
      </div>
      <div class="admin-filter-field">
        <label class="form-label">이름</label>
        <div class="admin-search d-flex align-items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="filters.name" type="text" class="admin-search-input" placeholder="이름 검색" />
        </div>
      </div>
      <button class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1" @click="resetFilters">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        초기화
      </button>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="table-responsive">
        <table class="table table-borderless mb-0">
          <thead>
            <tr>
              <th style="width: 36px;">
                <input type="checkbox" class="form-check-input" @change="toggleAll($event.target.checked)" :checked="allChecked" />
              </th>
              <th>Name</th>
              <th>NickName</th>
              <th>Date of Birth</th>
              <th>Academy</th>
              <th>Curriculum</th>
              <th>Day</th>
              <th>Level</th>
              <th>RSA Score</th>
              <th>YEPT</th>
              <th>AI Report</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in paged" :key="student.id">
              <td>
                <input type="checkbox" class="form-check-input" v-model="student.checked" />
              </td>
              <td>{{ student.name }}</td>
              <td>{{ student.nickname }}</td>
              <td>{{ student.dob }}</td>
              <td>{{ student.academy }}</td>
              <td>{{ student.curriculum }}</td>
              <td>{{ student.day }}</td>
              <td>{{ student.level }}</td>
              <td>
                <span class="admin-score-badge">{{ student.rsaScore }}점</span>
              </td>
              <td>
                <span class="admin-yept" :class="'admin-yept--' + student.yeptStatus">
                  <span class="admin-yept-dot"></span>{{ student.yeptText }}
                </span>
              </td>
              <td>
                <button class="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" style="white-space: nowrap;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  AI Report
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer: count + pagination + per-page -->
      <div class="d-flex align-items-center px-3 py-2 border-top border-hairline bg-canvas-soft">
        <span class="small text-faint" style="min-width: 100px;">{{ rangeText }} / {{ filtered.length }}명</span>
        <nav v-if="totalPages > 1" class="d-flex align-items-center gap-1 mx-auto">
          <button class="admin-page-btn" :disabled="page === 1" @click="page--">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button v-for="p in visiblePages" :key="p" class="admin-page-btn" :class="{ active: p === page }" @click="page = p">{{ p }}</button>
          <button class="admin-page-btn" :disabled="page === totalPages" @click="page++">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </nav>
        <div v-else class="mx-auto"></div>
        <select v-model.number="perPage" class="form-select form-select-sm admin-perpage-select">
          <option :value="10">10개</option>
          <option :value="20">20개</option>
          <option :value="50">50개</option>
        </select>
      </div>
    </div>
    <p v-if="filtered.length === 0" class="text-muted text-center small mt-3">검색 결과가 없습니다.</p>
  </div>
</template>

<script>
export default {
  layout: 'admin',
  title: 'Moby Read 리포트',
  data() {
    return {
      filters: { academy: '', curriculum: '', level: '', name: '' },
      page: 1,
      perPage: 10,
      students: [
        { id: 1, name: '김*린', nickname: 'Aileen', dob: '1908.**', academy: '말근소프트 강남점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'CA 3B', rsaScore: 85, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 2, name: '박*연', nickname: 'Ella', dob: '1905.**', academy: '말근소프트 강남점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'PG 6B', rsaScore: 92, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 3, name: '이*윤', nickname: 'Peter', dob: '1908.**', academy: '말근소프트 서초점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'PG 5B', rsaScore: 78, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 4, name: '이*이', nickname: '', dob: '1906.**', academy: '말근소프트 서초점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'CA 3B', rsaScore: 88, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 5, name: '장*우', nickname: 'Bella', dob: '1908.**', academy: '말근소프트 송파점', curriculum: 'Elementary (초등회화반)', day: '월수금(MWF)', level: 'PG 4A', rsaScore: 95, yeptStatus: 'wait', yeptText: '대기', checked: false },
        { id: 6, name: '정*원', nickname: 'Jenny', dob: '1906.**', academy: '말근소프트 송파점', curriculum: 'Elementary (초등회화반)', day: '월수금(MWF)', level: 'PG 4A', rsaScore: 72, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 7, name: '허*우', nickname: 'Lucas.H', dob: '1912.**', academy: '말근소프트 강동점', curriculum: 'ONE TO ONE', day: '화목(TTh)', level: 'CA 2A', rsaScore: 81, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 8, name: '허*빈', nickname: 'Belle', dob: '1912.**', academy: '말근소프트 강동점', curriculum: 'ONE TO ONE', day: '화목(TTh)', level: 'CA 2A', rsaScore: 90, yeptStatus: 'cancel', yeptText: '취소', checked: false },
        { id: 9, name: '강*준', nickname: 'Ethan', dob: '1910.**', academy: '말근소프트 마포점', curriculum: '단과', day: '화목(TTh)', level: 'PG 3B', rsaScore: 67, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 10, name: '윤*서', nickname: 'Sophie', dob: '1907.**', academy: '말근소프트 강남점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'CA 4A', rsaScore: 91, yeptStatus: 'progress', yeptText: '진행 중', checked: false },
        { id: 11, name: '최*호', nickname: 'Daniel', dob: '1909.**', academy: '말근소프트 강남점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'PG 5A', rsaScore: 83, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 12, name: '한*아', nickname: 'Olivia', dob: '1907.**', academy: '말근소프트 서초점', curriculum: 'Elementary (초등회화반)', day: '월수금(MWF)', level: 'CA 2B', rsaScore: 76, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 13, name: '서*민', nickname: 'Ryan', dob: '1911.**', academy: '말근소프트 강동점', curriculum: 'ONE TO ONE', day: '화목(TTh)', level: 'PG 3A', rsaScore: 89, yeptStatus: 'wait', yeptText: '대기', checked: false },
        { id: 14, name: '조*은', nickname: 'Grace', dob: '1908.**', academy: '말근소프트 송파점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'CA 4B', rsaScore: 94, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 15, name: '임*혁', nickname: 'Leo', dob: '1910.**', academy: '말근소프트 마포점', curriculum: '단과', day: '화목(TTh)', level: 'PG 4B', rsaScore: 71, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 16, name: '오*진', nickname: 'Chloe', dob: '1906.**', academy: '말근소프트 강남점', curriculum: 'Elementary (초등회화반)', day: '월수금(MWF)', level: 'CA 3A', rsaScore: 87, yeptStatus: 'progress', yeptText: '진행 중', checked: false },
        { id: 17, name: '유*빈', nickname: 'Emily', dob: '1909.**', academy: '말근소프트 서초점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'PG 6A', rsaScore: 96, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 18, name: '권*수', nickname: 'Mason', dob: '1911.**', academy: '말근소프트 강동점', curriculum: 'ONE TO ONE', day: '화목(TTh)', level: 'CA 2A', rsaScore: 74, yeptStatus: 'cancel', yeptText: '취소', checked: false },
        { id: 19, name: '신*영', nickname: 'Lily', dob: '1907.**', academy: '말근소프트 송파점', curriculum: 'Elementary (초등회화반)', day: '월수금(MWF)', level: 'PG 4A', rsaScore: 82, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 20, name: '문*기', nickname: 'Jake', dob: '1910.**', academy: '말근소프트 마포점', curriculum: '단과', day: '화목(TTh)', level: 'PG 3B', rsaScore: 69, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 21, name: '배*율', nickname: 'Noah', dob: '1908.**', academy: '말근소프트 강남점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'CA 3B', rsaScore: 93, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 22, name: '황*은', nickname: 'Mia', dob: '1906.**', academy: '말근소프트 서초점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'PG 5B', rsaScore: 80, yeptStatus: 'wait', yeptText: '대기', checked: false },
        { id: 23, name: '전*우', nickname: 'Henry', dob: '1912.**', academy: '말근소프트 강동점', curriculum: 'ONE TO ONE', day: '화목(TTh)', level: 'CA 2B', rsaScore: 86, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 24, name: '송*하', nickname: 'Zoe', dob: '1909.**', academy: '말근소프트 송파점', curriculum: 'Elementary (초등회화반)', day: '월수금(MWF)', level: 'PG 4A', rsaScore: 77, yeptStatus: 'done', yeptText: '완료', checked: false },
        { id: 25, name: '안*현', nickname: 'Oscar', dob: '1911.**', academy: '말근소프트 마포점', curriculum: '단과', day: '화목(TTh)', level: 'PG 3A', rsaScore: 70, yeptStatus: 'progress', yeptText: '진행 중', checked: false },
      ],
    }
  },
  watch: {
    filters: {
      deep: true,
      handler() { this.page = 1 }
    },
    perPage() { this.page = 1 }
  },
  computed: {
    academyOptions() {
      return [...new Set(this.students.map(s => s.academy))]
    },
    curriculumOptions() {
      return [...new Set(this.students.map(s => s.curriculum))]
    },
    levelOptions() {
      return [...new Set(this.students.map(s => s.level))].sort()
    },
    filtered() {
      return this.students.filter(s => {
        if (this.filters.academy && s.academy !== this.filters.academy) return false
        if (this.filters.curriculum && s.curriculum !== this.filters.curriculum) return false
        if (this.filters.level && s.level !== this.filters.level) return false
        if (this.filters.name && !s.name.includes(this.filters.name) && !s.nickname.toLowerCase().includes(this.filters.name.toLowerCase())) return false
        return true
      })
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.filtered.length / this.perPage))
    },
    paged() {
      var start = (this.page - 1) * this.perPage
      return this.filtered.slice(start, start + this.perPage)
    },
    rangeText() {
      if (this.filtered.length === 0) return '0'
      var start = (this.page - 1) * this.perPage + 1
      var end = Math.min(this.page * this.perPage, this.filtered.length)
      return start + '-' + end
    },
    visiblePages() {
      var pages = []
      var start = Math.max(1, this.page - 2)
      var end = Math.min(this.totalPages, start + 4)
      start = Math.max(1, end - 4)
      for (var i = start; i <= end; i++) pages.push(i)
      return pages
    },
    allChecked() {
      return this.paged.length > 0 && this.paged.every(s => s.checked)
    }
  },
  methods: {
    resetFilters() {
      this.filters = { academy: '', curriculum: '', level: '', name: '' }
    },
    toggleAll(checked) {
      this.paged.forEach(s => { s.checked = checked })
    }
  }
}
</script>

<style>
/* ── Report page styles ── */

/* Filter bar */
.admin-filter-bar {
  background-color: var(--color-canvas);
  border: 1px solid var(--color-hairline);
}
.admin-filter-field {
  min-width: 140px;
  flex: 1 1 140px;
  max-width: 200px;
}
.admin-filter-field--sm {
  min-width: 100px;
  flex: 1 1 100px;
  max-width: 140px;
}
@media (max-width: 575.98px) {
  .admin-filter-field,
  .admin-filter-field--sm {
    min-width: 0;
    flex: 1 1 calc(50% - 0.5rem);
    max-width: none;
  }
}

/* RSA Score badge — unified blue */
.admin-score-badge {
  display: inline-block;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: var(--rounded-full);
  background-color: #dbeafe;
  color: #1e40af;
}

/* YEPT status — dot + text style */
.admin-yept {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
}
.admin-yept-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.admin-yept--done { color: var(--color-ink-faint); }
.admin-yept--done .admin-yept-dot { background-color: var(--color-ink-faint); }
.admin-yept--wait { color: #7c3aed; }
.admin-yept--wait .admin-yept-dot { background-color: #7c3aed; }
.admin-yept--cancel { color: #dc2626; }
.admin-yept--cancel .admin-yept-dot { background-color: #dc2626; }
.admin-yept--progress { color: var(--color-primary); }
.admin-yept--progress .admin-yept-dot { background-color: var(--color-primary); }

/* Pagination */
.admin-page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 0.375rem;
  border: none;
  border-radius: var(--rounded-md);
  background: none;
  color: var(--color-ink-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}
.admin-page-btn:hover:not(:disabled) {
  background-color: var(--color-canvas-soft);
  color: var(--color-ink);
}
.admin-page-btn.active {
  background-color: var(--color-primary);
  color: #fff;
  font-weight: 600;
}
/* Per-page select */
.admin-perpage-select {
  width: auto;
  min-width: 70px;
  font-size: 0.8125rem;
  padding: 0.25rem 1.75rem 0.25rem 0.5rem;
}

.admin-page-btn:disabled {
  opacity: 0.3;
  cursor: default;
}
</style>
