// ===== サンプルデータ =====
const rowData = [
  { id: 'G1-1', groupId: 'G1', category: 'A', item: 'A-1', qty: 5 },
  { id: 'G1-2', groupId: 'G1', category: 'A', item: 'A-2', qty: 2 },

  { id: 'G2-1', groupId: 'G2', category: 'B', item: 'B-1', qty: 7 },
  { id: 'G2-2', groupId: 'G2', category: 'B', item: 'B-2', qty: 3 },

  { id: 'G3-1', groupId: 'G3', category: 'C', item: 'C-1', qty: 4 },
  { id: 'G3-2', groupId: 'G3', category: 'C', item: 'C-2', qty: 6 },

  // 値は同じ "C" でも groupId が違うため結合されない例
  { id: 'G4-1', groupId: 'G4', category: 'C', item: 'C-3', qty: 1 },
];

// ===== 設定：結合 & 一括反映対象列 =====
const MERGE_TARGET_COLS = ['category'];

// 合成キー（「値一致かつ同groupId」を1発で満たす）
const mergeKeyOf = (data, colId) => `${data.groupId}::${data[colId] ?? ''}`;

// ===== Excelライク一括反映：同groupIdの全行へ新値を配布 =====
let syncing = false; // 再入防止
function onCellValueChanged(params) {
  const colId = params.column.getColId();
  if (!MERGE_TARGET_COLS.includes(colId)) return;

  // エディタは表示値（category）を編集するので、old/new の比較は data 側でする
  const newVal = params.data[colId];
  if (params.oldValue === newVal) return;

  const gid = params.data.groupId;
  if (syncing) return;
  syncing = true;

  params.api.forEachNode((node) => {
    if (!node.data) return;
    if (node === params.node) return;
    if (node.data.groupId !== gid) return;
    if (node.data[colId] === newVal) return;
    node.setDataValue(colId, newVal);
  });

  syncing = false;
  // 結合表示列と編集列の両方を更新
  params.api.refreshCells({ 
    force: true,
    columns: ['categoryDisplay', 'category'] // 両方の列を強制更新
  });
}

// ====== グループ単位の上下移動（完全再実装版） ======

// グリッドAPI参照を保持
let gridApi = null;

// 対象グループIDを取得する関数
function getTargetGroupId() {
  if (!gridApi) return null;
  
  // 選択行から取得を試行
  const selectedNodes = gridApi.getSelectedNodes();
  if (selectedNodes.length > 0 && selectedNodes[0].data) {
    return selectedNodes[0].data.groupId;
  }
  
  // フォーカス行から取得を試行
  const focusedCell = gridApi.getFocusedCell();
  if (focusedCell) {
    const node = gridApi.getDisplayedRowAtIndex(focusedCell.rowIndex);
    if (node && node.data) {
      return node.data.groupId;
    }
  }
  
  return null;
}

// ソート・フィルタ状態をチェック
function hasActiveSortOrFilter() {
  if (!gridApi) return false;
  
  // フィルタのチェック
  const hasFilter = gridApi.isAnyFilterPresent && gridApi.isAnyFilterPresent();
  
  // ソートのチェック（正しいAPI使用）
  let hasSort = false;
  try {
    const columnState = gridApi.getColumnState();
    hasSort = columnState && columnState.some(col => col.sort !== null && col.sort !== undefined);
  } catch (error) {
    console.warn('ソート状態の取得に失敗:', error);
    hasSort = false;
  }
  
  console.log('フィルタ状態:', hasFilter, 'ソート状態:', hasSort);
  return hasFilter || hasSort;
}

// 現在のデータからグループ情報を抽出
function extractGroupInfo() {
  const allData = [];
  const groupOrder = [];
  const groupDataMap = new Map();
  
  // 現在の表示順でデータを取得（正しいAPI使用）
  gridApi.forEachNode((node) => {
    if (node.data) {
      allData.push(node.data);
      
      const groupId = node.data.groupId;
      if (!groupDataMap.has(groupId)) {
        groupOrder.push(groupId);
        groupDataMap.set(groupId, []);
      }
      groupDataMap.get(groupId).push(node.data);
    }
  });
  
  return {
    allData,
    groupOrder,
    groupDataMap
  };
}

// グループを指定方向に移動
function moveGroupInDirection(direction) {
  console.log('moveGroupInDirection called with direction:', direction);
  
  // 前提条件チェック
  if (!gridApi) {
    console.error('Grid API が利用できません');
    alert('Grid API が利用できません');
    return false;
  }
  console.log('Grid API OK');
  
  if (hasActiveSortOrFilter()) {
    console.log('ソート/フィルタが適用されています');
    alert('ソートまたはフィルタが適用されています。\n移動する前に解除してください。');
    return false;
  }
  console.log('ソート/フィルタ チェック OK');
  
  const targetGroupId = getTargetGroupId();
  console.log('対象グループID:', targetGroupId);
  if (!targetGroupId) {
    alert('移動するグループを選択してください。\n行を選択するかセルにフォーカスしてください。');
    return false;
  }
  
  // 移動前のフォーカス情報を記憶
  const focusedCell = gridApi.getFocusedCell();
  let focusInfo = null;
  if (focusedCell && focusedCell.rowIndex !== null) {
    const focusedNode = gridApi.getDisplayedRowAtIndex(focusedCell.rowIndex);
    if (focusedNode && focusedNode.data && focusedNode.data.groupId === targetGroupId) {
      // 同じグループ内でのフォーカス位置を記憶（グループ内での相対位置）
      focusInfo = {
        columnId: focusedCell.column.getColId(),
        groupRelativeIndex: 0 // グループ内での行番号を計算
      };
      
      // グループ内での相対インデックスを計算
      let groupRowCount = 0;
      gridApi.forEachNode((node) => {
        if (node.data && node.data.groupId === targetGroupId) {
          if (node.rowIndex < focusedCell.rowIndex) {
            groupRowCount++;
          } else if (node.rowIndex === focusedCell.rowIndex) {
            focusInfo.groupRelativeIndex = groupRowCount;
          }
        }
      });
    }
  }
  console.log('移動前フォーカス情報:', focusInfo);
  
  // 現在のグループ情報を取得
  const { groupOrder, groupDataMap } = extractGroupInfo();
  console.log('グループ順序:', groupOrder);
  console.log('グループデータマップ:', groupDataMap);
  
  // 移動対象グループのインデックスを取得
  const currentIndex = groupOrder.indexOf(targetGroupId);
  console.log('現在のインデックス:', currentIndex);
  if (currentIndex === -1) {
    console.error('対象グループが見つかりません:', targetGroupId);
    alert('対象グループが見つかりません: ' + targetGroupId);
    return false;
  }
  
  // 移動先インデックスを計算
  const newIndex = currentIndex + direction;
  console.log('移動先インデックス:', newIndex);
  if (newIndex < 0 || newIndex >= groupOrder.length) {
    console.log('移動範囲外です');
    alert('これ以上' + (direction < 0 ? '上' : '下') + 'には移動できません');
    return false;
  }
  
  // グループ順序を更新
  const newGroupOrder = [...groupOrder];
  [newGroupOrder[currentIndex], newGroupOrder[newIndex]] = 
    [newGroupOrder[newIndex], newGroupOrder[currentIndex]];
  console.log('新しいグループ順序:', newGroupOrder);
  
  // 新しいデータ順序を構築
  const newRowData = [];
  for (const groupId of newGroupOrder) {
    const groupData = groupDataMap.get(groupId) || [];
    newRowData.push(...groupData);
  }
  console.log('新しい行データ:', newRowData);
  
  // データを更新（v34の正しい方法）
  gridApi.setGridOption('rowData', newRowData);
  console.log('データ更新完了');
  
  // 移動後の状態復元
  setTimeout(() => {
    restoreSelectionAfterMove(targetGroupId, focusInfo);
  }, 100);
  
  return true;
}

// 移動後に選択状態を解除してフォーカス復元
function restoreSelectionAfterMove(targetGroupId, focusInfo) {
  if (!gridApi || !targetGroupId) return;
  
  // 全選択解除（チェックボックスのチェックを外す）
  gridApi.deselectAll();
  
  let firstRowIndex = -1;
  let targetRowIndex = -1;
  let groupRowCount = 0;
  
  // 移動したグループの行を見つけて、フォーカス対象行を特定
  gridApi.forEachNode((node) => {
    if (node.data && node.data.groupId === targetGroupId) {
      if (firstRowIndex === -1) {
        firstRowIndex = node.rowIndex;
      }
      
      // フォーカス情報がある場合、グループ内の相対位置に基づいて設定
      if (focusInfo && groupRowCount === focusInfo.groupRelativeIndex) {
        targetRowIndex = node.rowIndex;
      }
      groupRowCount++;
    }
  });
  
  // フォーカスを復元
  if (focusInfo && targetRowIndex >= 0) {
    // 移動前と同じセルにフォーカスを設定
    setTimeout(() => {
      gridApi.setFocusedCell(targetRowIndex, focusInfo.columnId);
      gridApi.ensureIndexVisible(targetRowIndex, 'middle');
      console.log(`フォーカスを復元: 行${targetRowIndex}, 列${focusInfo.columnId}`);
    }, 50);
  } else if (firstRowIndex >= 0) {
    // フォーカス情報がない場合は最初の行にスクロールのみ
    gridApi.ensureIndexVisible(firstRowIndex, 'middle');
  }
  
  console.log(`グループ ${targetGroupId} を移動完了。選択解除、フォーカス復元しました。`);
}

// 上移動関数
function moveGroupUp() {
  return moveGroupInDirection(-1);
}

// 下移動関数  
function moveGroupDown() {
  return moveGroupInDirection(1);
}

document.addEventListener('DOMContentLoaded', () => {
  const gridDiv = document.querySelector('#myGrid');

  const columnDefs = [
    {
      headerName: 'カテゴリ（結合表示）',
      field: 'categoryDisplay',
      width: 200,
      editable: false, // 結合表示のため編集不可

      // === 結合表示専用：spanRows有効 ===
      valueGetter: (p) => mergeKeyOf(p.data, 'category'),
      valueFormatter: (p) => (p.data ? p.data.category : ''),
      spanRows: true,

      comparator: (a, b, nodeA, nodeB) =>
        String(nodeA?.data?.category ?? '').localeCompare(String(nodeB?.data?.category ?? '')),
      filter: 'agTextColumnFilter',
      filterValueGetter: (p) => (p.data ? p.data.category : ''),
    },
    {
      headerName: 'カテゴリ（編集用）',
      field: 'category',
      width: 150,
      editable: true, // 編集専用

      // === 編集専用：spanRows無効 ===
      cellEditor: 'agTextCellEditor',
      filter: 'agTextColumnFilter',
    },
    { headerName: 'アイテム', field: 'item', editable: true, filter: 'agTextColumnFilter' },
    { headerName: '数量', field: 'qty', editable: true, filter: 'agNumberColumnFilter' },
    { headerName: 'groupId（参考）', field: 'groupId' },
  ];

  const gridOptions = {
    columnDefs,
    rowData,

    // v34テーマ設定: レガシーテーマを使用
    theme: 'legacy',

    enableCellSpan: true, // 行結合を有効化

    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
    },
    animateRows: true,
    getRowId: (p) => p.data.id,

    onCellValueChanged,
    rowSelection: { mode: 'singleRow' }, // 行選択で対象グループを決めやすく
  };

  // Grid を作成してAPI参照を保存
  const grid = agGrid.createGrid(gridDiv, gridOptions);
  
  // デバッグ：戻り値の構造を確認
  console.log('createGrid戻り値:', grid);
  console.log('grid.api:', grid?.api);
  
  // AG-Grid v34では直接APIが返される場合がある
  gridApi = grid.api || grid; // グローバル変数に保存
  
  console.log('保存されたgridApi:', gridApi);

  // グリッド初期化完了を少し待ってからボタンを有効化
  setTimeout(() => {
    // 上下移動ボタン
    document.getElementById('btnUp').addEventListener('click', () => {
      console.log('上ボタンがクリックされました');
      moveGroupUp();
    });
    document.getElementById('btnDown').addEventListener('click', () => {
      console.log('下ボタンがクリックされました');
      moveGroupDown();
    });
    
    console.log('ボタンイベントリスナー設定完了');
  }, 100);
});
