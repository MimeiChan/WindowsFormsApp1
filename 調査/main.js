// 列定義
const columnDefs = [
  { field: 'athlete', headerName: 'Athlete', minWidth: 150, flex: 1 },
  { field: 'age', headerName: 'Age', width: 90 },
  { field: 'country', headerName: 'Country', minWidth: 140 },
  { field: 'year', headerName: 'Year', width: 90 },
  { field: 'sport', headerName: 'Sport', minWidth: 140 },
  { field: 'gold', headerName: 'Gold', width: 90 },
  { field: 'silver', headerName: 'Silver', width: 90 },
  { field: 'bronze', headerName: 'Bronze', width: 90 },
];

// サンプルデータ（適当に数件）
const rowData = [
  { athlete: 'Michael Phelps', age: 23, country: 'USA', year: 2008, sport: 'Swimming', gold: 8, silver: 0, bronze: 0 },
  { athlete: 'Usain Bolt', age: 22, country: 'Jamaica', year: 2008, sport: 'Athletics', gold: 3, silver: 0, bronze: 0 },
  { athlete: 'Allyson Felix', age: 30, country: 'USA', year: 2016, sport: 'Athletics', gold: 2, silver: 1, bronze: 0 },
  { athlete: 'Kosuke Hagino', age: 22, country: 'Japan', year: 2016, sport: 'Swimming', gold: 1, silver: 0, bronze: 1 },
  { athlete: 'Naomi Osaka', age: 23, country: 'Japan', year: 2020, sport: 'Tennis', gold: 0, silver: 0, bronze: 0 },
  { athlete: 'Simone Biles', age: 19, country: 'USA', year: 2016, sport: 'Gymnastics', gold: 4, silver: 0, bronze: 1 },
  { athlete: 'Yuzuru Hanyu', age: 23, country: 'Japan', year: 2018, sport: 'Figure Skating', gold: 1, silver: 0, bronze: 0 },
  { athlete: 'Mo Farah', age: 29, country: 'Great Britain', year: 2012, sport: 'Athletics', gold: 2, silver: 0, bronze: 0 },
  { athlete: 'Katie Ledecky', age: 19, country: 'USA', year: 2016, sport: 'Swimming', gold: 4, silver: 1, bronze: 0 },
  { athlete: 'Rikako Ikee', age: 21, country: 'Japan', year: 2020, sport: 'Swimming', gold: 0, silver: 0, bronze: 0 },
];

// Gridオプション
const gridOptions = {
  columnDefs,
  rowData,

  defaultColDef: {
    sortable: true,
    filter: true,
    resizable: true,
  },

  // 必要に応じて行高など
  rowHeight: 38,

  // 初期フォーカス（視覚的に分かりやすくするため任意）
  onFirstDataRendered(params) {
    // 0行目・athlete列にフォーカス
    params.api.setFocusedCell(0, 'athlete');
  },

  // 参考：フォーカスイベントで任意処理を入れたい場合
  // onCellFocused(e) {
  //   console.log('focused:', e.rowIndex, e.column && e.column.getColId());
  // },
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  const eGrid = document.getElementById('myGrid');
  // UMDのグローバル（ag-grid-community.min.js）読み込み後に利用可能
  agGrid.createGrid(eGrid, gridOptions);
});
