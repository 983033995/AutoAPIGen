<script setup lang="ts">
// 定义请求参数接口
interface RequestParam {
  name: string
  type: string
  required?: boolean
  description?: string
  example?: any
  children?: RequestParam[]
  title?: string
}

// 定义props接口
interface Props {
  data: RequestParam[]
  showExample?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showExample: true
})

// 实现展开行的管理
const expandedRowKeys = ref<string[]>([]);

// 构造唯一的行key - 添加更多唯一性保证
const getRowKey = (record: RequestParam) => {
  return `${record.name}-${record.type}-${Math.random().toString(36).substring(2, 7)}`;
}

// 处理行展开和收起
const handleRowExpand = (rowKey: string, record: RequestParam) => {
  const index = expandedRowKeys.value.indexOf(rowKey);
  if (index > -1) {
    // 已展开，需要收起
    expandedRowKeys.value.splice(index, 1);
  } else {
    // 未展开，需要展开
    expandedRowKeys.value.push(rowKey);
  }
}

// 判断参数是否有子参数
const hasChildren = (record: RequestParam) => {
  return record.children && record.children.length > 0;
}
</script>

<template>
  <a-table 
    :data="data" 
    :bordered="false" 
    size="small" 
    :pagination="false"
    :row-key="getRowKey"
    :expanded-row-keys="expandedRowKeys"
  >
    <template #columns>
      <a-table-column title="参数名" data-index="name">
        <template #cell="{ record, rowKey }">
          <div class="flex items-center">
            <!-- 添加展开/折叠图标，可点击 -->
            <span 
              v-if="hasChildren(record)" 
              class="expand-icon mr-1 cursor-pointer"
              @click="handleRowExpand(rowKey, record)"
            >
              <icon
                :class="expandedRowKeys.includes(rowKey) ? 'expanded icon-tabler-chevron-down' : 'icon-tabler-chevron-right'"
              />
            </span>
            <span class="font-mono">{{ record.name }}</span>
            <span v-if="record.required" class="text-red-500 ml-1">*</span>
          </div>
        </template>
      </a-table-column>
      <a-table-column title="类型" data-index="type" :width="120">
        <template #cell="{ record }">
          <span class="text-blue-600">{{ record.type }}</span>
        </template>
      </a-table-column>
      <a-table-column title="必填" data-index="required" :width="90">
        <template #cell="{ record }">
          <a-tag size="small" :color="record.required ? 'red' : ''">
            {{ record.required ? '必填' : '可选' }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column title="示例值" data-index="example" :width="160" v-if="showExample">
        <template #cell="{ record }">
          <div class="whitespace-pre-wrap text-gray-500 text-[12px]">
            {{ typeof record.example === 'object' ? JSON.stringify(record.example) : record.example }}
          </div>
        </template>
      </a-table-column>
      <a-table-column title="说明" data-index="description">
        <template #cell="{ record }">
          <div v-if="record.title">{{ record.title }}</div>
          <div class="whitespace-pre-wrap">{{ record.description }}</div>
        </template>
      </a-table-column>
    </template>
    
    <!-- 使用 expand-row 插槽处理子参数 -->
    <template #expand-row="{ record, rowKey }">
      <div class="pl-4 pt-2" v-if="record.children && record.children.length > 0">
        <a-table 
          :data="record.children"
          :bordered="false"
          size="small"
          :pagination="false"
          :row-key="getRowKey"
          :expanded-row-keys="expandedRowKeys"
        >
          <template #columns>
            <a-table-column title="参数名" data-index="name">
              <template #cell="{ record, rowKey }">
                <div class="flex items-center">
                  <!-- 子表格中的展开/折叠图标 -->
                  <span 
                    v-if="hasChildren(record)" 
                    class="expand-icon mr-1 cursor-pointer"
                    @click="handleRowExpand(rowKey, record)"
                  >
                    <icon
                      :class="expandedRowKeys.includes(rowKey) ? 'expanded icon-tabler-chevron-down' : 'icon-tabler-chevron-right'"
                    />
                  </span>
                  <span class="font-mono">{{ record.name }}</span>
                  <span v-if="record.required" class="text-red-500 ml-1">*</span>
                </div>
              </template>
            </a-table-column>
            <a-table-column title="类型" data-index="type" :width="120">
              <template #cell="{ record }">
                <span class="text-blue-600">{{ record.type }}</span>
              </template>
            </a-table-column>
            <a-table-column title="必填" data-index="required" :width="90">
              <template #cell="{ record }">
                <a-tag size="small" :color="record.required ? 'red' : ''">
                  {{ record.required ? '必填' : '可选' }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column title="示例值" data-index="example" :width="160" v-if="showExample">
              <template #cell="{ record }">
                <div class="whitespace-pre-wrap text-gray-500 text-[12px]">
                  {{ typeof record.example === 'object' ? JSON.stringify(record.example) : record.example }}
                </div>
              </template>
            </a-table-column>
            <a-table-column title="说明" data-index="description">
              <template #cell="{ record }">
                <div v-if="record.title">{{ record.title }}</div>
                <div class="whitespace-pre-wrap">{{ record.description }}</div>
              </template>
            </a-table-column>
          </template>
          
          <!-- 处理嵌套的子参数 -->
          <template #expand-row="nestedProps">
            <div class="pl-4 pt-2" v-if="nestedProps.record.children && nestedProps.record.children.length > 0">
              <!-- 递归使用当前组件展示深层嵌套 -->
              <ParamTable :data="nestedProps.record.children" :show-example="showExample" />
            </div>
          </template>
        </a-table>
      </div>
    </template>
  </a-table>
</template>

<style scoped>
.expand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: #86909c;
  transition: transform 0.2s;
}

.expand-icon .expanded {
  transform: rotate(90deg);
}

.cursor-pointer {
  cursor: pointer;
}
</style> 