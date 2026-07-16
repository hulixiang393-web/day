/* 数据导入 */

import { TaskModel } from '../data/models/task.js';
import { showToast } from '../core/toast.js';

/** 导入 JSON 数据 */
export async function importJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);

    if (!data.tasks || !Array.isArray(data.tasks)) {
      throw new Error('数据格式不正确：缺少 tasks 数组');
    }

    let count = 0;
    for (const taskData of data.tasks) {
      // 移除原有 ID，生成新 ID
      const { id, createdAt, updatedAt, completedAt, ...rest } = taskData;
      await TaskModel.create({
        ...rest,
        status: rest.status || 'pending',
      });
      count++;
    }

    showToast(`✅ 成功导入 ${count} 个任务`, 'success');
    return count;
  } catch (e) {
    showToast(`导入失败: ${e.message}`, 'error');
    throw e;
  }
}

/** 解析 CSV 文本 */
export function parseCSV(csvString) {
  const lines = csvString.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  // 解析表头
  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

/** 从 CSV 导入任务 */
export async function importCSV(csvString) {
  try {
    const rows = parseCSV(csvString);
    let count = 0;

    // 列名映射
    const colMap = {
      '标题': 'title', '任务': 'title',
      '描述': 'description', '备注': 'description',
      '分类': 'categoryId',
      '优先级': 'priority',
      '状态': 'status',
      '截止日期': 'endDate', '日期': 'endDate', '结束日期': 'endDate',
      '截止时间': 'endTime', '时间': 'endTime', '结束时间': 'endTime',
      '开始日期': 'startDate', '开始时间': 'startTime',
      '标签': 'tags',
    };

    const priorityMap = { '普通': 0, '重要': 1, '紧急': 2, '极致重要': 3 };

    for (const row of rows) {
      const taskData = {};
      for (const [col, val] of Object.entries(row)) {
        const mapped = colMap[col] || col;
        if (mapped === 'priority') {
          taskData.priority = priorityMap[val] ?? parseInt(val) || 0;
        } else if (mapped === 'tags') {
          taskData.tags = val.split(/[;,]/).map((t) => t.trim()).filter(Boolean);
        } else {
          taskData[mapped] = val;
        }
      }

      if (taskData.title) {
        await TaskModel.create(taskData);
        count++;
      }
    }

    showToast(`✅ 从 CSV 导入 ${count} 个任务`, 'success');
    return count;
  } catch (e) {
    showToast(`CSV 导入失败: ${e.message}`, 'error');
    throw e;
  }
}

/** 触发文件选择 */
export function pickFile(accept = '.json,.csv', callback) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    if (file.name.endsWith('.json')) {
      await importJSON(text);
    } else if (file.name.endsWith('.csv')) {
      await importCSV(text);
    }
    if (callback) callback();
  });
  input.click();
}

/** 解析 CSV 行 (处理引号内的逗号) */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
