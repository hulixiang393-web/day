/* 导出功能 */

import { formatDate } from '../core/utils.js';

/** 导出为 JSON */
export function exportJSON(tasks, filename = 'planner-backup') {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks: tasks,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${filename}-${formatDate(new Date())}.json`);
}

/** 导出为 CSV */
export function exportCSV(tasks, filename = 'planner-tasks') {
  const headers = ['标题', '描述', '分类', '优先级', '状态', '开始日期', '开始时间', '结束日期', '结束时间', '标签', '创建时间'];
  const rows = tasks.map((t) => [
    t.title,
    t.description,
    t.categoryId || '',
    ['普通', '重要', '紧急', '极致重要'][t.priority] || '',
    ['未开始', '进行中', '已完成', '已逾期', '已取消'][
      { pending: 0, in_progress: 1, completed: 2, overdue: 3, cancelled: 4 }[t.status] || 0
    ],
    t.startDate || '',
    t.startTime || '',
    t.endDate || '',
    t.endTime || '',
    (t.tags || []).join(';'),
    t.createdAt || '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // BOM for Excel Chinese support
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${filename}-${formatDate(new Date())}.csv`);
}

/** 打印 (PDF 导出) */
export function printTasks() {
  window.print();
}

/** 下载 Blob */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
