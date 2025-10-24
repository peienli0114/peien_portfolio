import React from 'react';

type SidebarProps = {
  title: string;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
  children: React.ReactNode;
};

const Sidebar: React.FC<SidebarProps> = ({
  title,
  isCollapsed,
  onCollapseToggle,
  children,
}) => (
  <div className="sidebar">
    <div className="sidebar-header desktop-only">
      <h1 className="sidebar-title">{title}</h1>
      <button
        type="button"
        className="sidebar-collapse-control"
        onClick={onCollapseToggle}
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? '展開目錄' : '收合目錄'}
      </button>
    </div>
    <nav className="nav-menu">{children}</nav>
  </div>
);

export default Sidebar;
