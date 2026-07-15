/* 初始化种子数据 */

import db from './db.js';
import { CategoryModel } from './models/category.js';
import { TemplateModel } from './models/template.js';

export async function seedData() {
  await db.open();

  // 初始化默认分类
  await CategoryModel.seedDefaults();

  // 初始化内置模板
  await TemplateModel.seedBuiltins();

  console.log('[Seed] Default data initialized');
}
