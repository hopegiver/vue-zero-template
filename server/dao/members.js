const members = [
  { id: 1, name: '김*린', nickname: 'Aileen', dob: '1908.**', academy: '말근소프트 강남점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'CA 3B', rsaScore: 85, yeptStatus: 'done', yeptText: '완료' },
  { id: 2, name: '박*연', nickname: 'Ella', dob: '1905.**', academy: '말근소프트 강남점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'PG 6B', rsaScore: 92, yeptStatus: 'done', yeptText: '완료' },
  { id: 3, name: '이*윤', nickname: 'Peter', dob: '1908.**', academy: '말근소프트 서초점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'PG 5B', rsaScore: 78, yeptStatus: 'done', yeptText: '완료' },
  { id: 4, name: '이*이', nickname: '', dob: '1906.**', academy: '말근소프트 서초점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'CA 3B', rsaScore: 88, yeptStatus: 'done', yeptText: '완료' },
  { id: 5, name: '장*우', nickname: 'Bella', dob: '1908.**', academy: '말근소프트 송파점', curriculum: 'Elementary (초등회화반)', day: '월수금(MWF)', level: 'PG 4A', rsaScore: 95, yeptStatus: 'wait', yeptText: '대기' },
  { id: 6, name: '정*원', nickname: 'Jenny', dob: '1906.**', academy: '말근소프트 송파점', curriculum: 'Elementary (초등회화반)', day: '월수금(MWF)', level: 'PG 4A', rsaScore: 72, yeptStatus: 'done', yeptText: '완료' },
  { id: 7, name: '허*우', nickname: 'Lucas.H', dob: '1912.**', academy: '말근소프트 강동점', curriculum: 'ONE TO ONE', day: '화목(TTh)', level: 'CA 2A', rsaScore: 81, yeptStatus: 'done', yeptText: '완료' },
  { id: 8, name: '허*빈', nickname: 'Belle', dob: '1912.**', academy: '말근소프트 강동점', curriculum: 'ONE TO ONE', day: '화목(TTh)', level: 'CA 2A', rsaScore: 90, yeptStatus: 'cancel', yeptText: '취소' },
  { id: 9, name: '강*준', nickname: 'Ethan', dob: '1910.**', academy: '말근소프트 마포점', curriculum: '단과', day: '화목(TTh)', level: 'PG 3B', rsaScore: 67, yeptStatus: 'done', yeptText: '완료' },
  { id: 10, name: '윤*서', nickname: 'Sophie', dob: '1907.**', academy: '말근소프트 강남점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'CA 4A', rsaScore: 91, yeptStatus: 'progress', yeptText: '진행 중' },
  { id: 11, name: '최*호', nickname: 'Daniel', dob: '1909.**', academy: '말근소프트 강남점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'PG 5A', rsaScore: 83, yeptStatus: 'done', yeptText: '완료' },
  { id: 12, name: '한*아', nickname: 'Olivia', dob: '1907.**', academy: '말근소프트 서초점', curriculum: 'Elementary (초등회화반)', day: '월수금(MWF)', level: 'CA 2B', rsaScore: 76, yeptStatus: 'done', yeptText: '완료' },
  { id: 13, name: '서*민', nickname: 'Ryan', dob: '1911.**', academy: '말근소프트 강동점', curriculum: 'ONE TO ONE', day: '화목(TTh)', level: 'PG 3A', rsaScore: 89, yeptStatus: 'wait', yeptText: '대기' },
  { id: 14, name: '조*은', nickname: 'Grace', dob: '1908.**', academy: '말근소프트 송파점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'CA 4B', rsaScore: 94, yeptStatus: 'done', yeptText: '완료' },
  { id: 15, name: '임*혁', nickname: 'Leo', dob: '1910.**', academy: '말근소프트 마포점', curriculum: '단과', day: '화목(TTh)', level: 'PG 4B', rsaScore: 71, yeptStatus: 'done', yeptText: '완료' },
  { id: 16, name: '오*진', nickname: 'Chloe', dob: '1906.**', academy: '말근소프트 강남점', curriculum: 'Elementary (초등회화반)', day: '월수금(MWF)', level: 'CA 3A', rsaScore: 87, yeptStatus: 'progress', yeptText: '진행 중' },
  { id: 17, name: '유*빈', nickname: 'Emily', dob: '1909.**', academy: '말근소프트 서초점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'PG 6A', rsaScore: 96, yeptStatus: 'done', yeptText: '완료' },
  { id: 18, name: '권*수', nickname: 'Mason', dob: '1911.**', academy: '말근소프트 강동점', curriculum: 'ONE TO ONE', day: '화목(TTh)', level: 'CA 2A', rsaScore: 74, yeptStatus: 'cancel', yeptText: '취소' },
  { id: 19, name: '신*영', nickname: 'Lily', dob: '1907.**', academy: '말근소프트 송파점', curriculum: 'Elementary (초등회화반)', day: '월수금(MWF)', level: 'PG 4A', rsaScore: 82, yeptStatus: 'done', yeptText: '완료' },
  { id: 20, name: '문*기', nickname: 'Jake', dob: '1910.**', academy: '말근소프트 마포점', curriculum: '단과', day: '화목(TTh)', level: 'PG 3B', rsaScore: 69, yeptStatus: 'done', yeptText: '완료' },
  { id: 21, name: '배*율', nickname: 'Noah', dob: '1908.**', academy: '말근소프트 강남점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'CA 3B', rsaScore: 93, yeptStatus: 'done', yeptText: '완료' },
  { id: 22, name: '황*은', nickname: 'Mia', dob: '1906.**', academy: '말근소프트 서초점', curriculum: 'Ivy Master', day: '월화수목금(MTWThF)', level: 'PG 5B', rsaScore: 80, yeptStatus: 'wait', yeptText: '대기' },
  { id: 23, name: '전*우', nickname: 'Henry', dob: '1912.**', academy: '말근소프트 강동점', curriculum: 'ONE TO ONE', day: '화목(TTh)', level: 'CA 2B', rsaScore: 86, yeptStatus: 'done', yeptText: '완료' },
  { id: 24, name: '송*하', nickname: 'Zoe', dob: '1909.**', academy: '말근소프트 송파점', curriculum: 'Elementary (초등회화반)', day: '월수금(MWF)', level: 'PG 4A', rsaScore: 77, yeptStatus: 'done', yeptText: '완료' },
  { id: 25, name: '안*현', nickname: 'Oscar', dob: '1911.**', academy: '말근소프트 마포점', curriculum: '단과', day: '화목(TTh)', level: 'PG 3A', rsaScore: 70, yeptStatus: 'progress', yeptText: '진행 중' },
]

export default class MembersDao {
  constructor(env) { this.env = env }
  findAll() { return members }
}
