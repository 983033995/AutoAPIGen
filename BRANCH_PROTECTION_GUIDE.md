# GitHub 分支保护规则设置指南

## 概述

分支保护规则是 GitHub 提供的重要功能，用于保护重要分支（如 `main`）免受意外修改，确保代码质量和团队协作的规范性。

## 设置步骤

### 1. 访问仓库设置

1. 打开你的 GitHub 仓库页面
2. 点击 **Settings** 选项卡
3. 在左侧菜单中找到 **Branches**

### 2. 添加分支保护规则

1. 点击 **Add rule** 按钮
2. 在 **Branch name pattern** 中输入 `main`（或你要保护的分支名）

### 3. 推荐的保护规则配置

#### 基础保护设置

- ✅ **Require a pull request before merging**
  - 强制通过 Pull Request 合并代码
  - ✅ **Require approvals**: 设置为 `1`（至少需要1个审批）
  - ✅ **Dismiss stale PR approvals when new commits are pushed**
  - ✅ **Require review from code owners**（如果有 CODEOWNERS 文件）

#### 状态检查要求

- ✅ **Require status checks to pass before merging**
  - ✅ **Require branches to be up to date before merging**
  - 添加必需的状态检查：
    - `ci/circleci: setup`
    - `ci/circleci: build`
    - `ci/circleci: lint`
    - `ci/circleci: test`
    - `ci/circleci: typecheck`

#### 其他重要设置

- ✅ **Require conversation resolution before merging**
  - 确保所有讨论都已解决
- ✅ **Require signed commits**（推荐）
  - 提高安全性
- ✅ **Require linear history**（可选）
  - 保持清晰的提交历史
- ✅ **Include administrators**
  - 管理员也需要遵守规则

#### 限制推送设置

- ✅ **Restrict pushes that create files**（可选）
- ✅ **Restrict pushes that delete files**（可选）

### 4. 高级配置

#### 自动删除头分支

- ✅ **Automatically delete head branches**
  - 在 PR 合并后自动删除特性分支

#### 允许特定用户绕过

- 在 **Restrict pushes that create files** 下可以添加例外用户或团队
- 建议只给核心维护者添加例外权限

## 配置示例

以下是针对 AutoAPIGen 项目的推荐配置：

```yaml
分支保护规则配置:
  分支模式: main

  Pull Request 要求:
    - 需要 Pull Request 才能合并: ✅
    - 需要审批数量: 1
    - 新提交时取消过期审批: ✅
    - 需要代码所有者审批: ✅

  状态检查要求:
    - 合并前必须通过状态检查: ✅
    - 分支必须是最新的: ✅
    - 必需的状态检查:
      * ci/circleci: setup
      * ci/circleci: build
      * ci/circleci: lint
      * ci/circleci: test
      * ci/circleci: typecheck

  其他限制:
    - 合并前解决所有对话: ✅
    - 需要签名提交: ✅
    - 包括管理员: ✅
    - 自动删除头分支: ✅
```

## 验证设置

设置完成后，你可以通过以下方式验证：

1. 尝试直接推送到 `main` 分支（应该被阻止）
2. 创建一个测试 PR，确保所有检查都正常运行
3. 验证 PR 需要审批才能合并

## 注意事项

1. **首次设置**：如果你是第一次设置分支保护，建议先在测试分支上验证配置
2. **CI/CD 集成**：确保你的 CircleCI 配置正常工作，否则状态检查会失败
3. **团队协作**：向团队成员说明新的工作流程
4. **紧急情况**：管理员可以临时禁用保护规则处理紧急问题

## 相关文档

- [GitHub 分支保护规则官方文档](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [CircleCI 状态检查集成](https://circleci.com/docs/enable-checks/)

---

**提示**：设置分支保护规则后，所有代码更改都必须通过 Pull Request 流程，这将显著提高代码质量和团队协作效率。
