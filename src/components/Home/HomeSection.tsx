import React from 'react';

type HomeSectionProps = {
  onNavigateCv: () => void;
  onNavigatePortfolio: () => void;
};

const HomeSection: React.FC<HomeSectionProps> = ({
  onNavigateCv,
  onNavigatePortfolio,
}) => (
  <div className="content-wrapper home-section">
    <div className="home-greeting">
      <span>李佩恩作品集</span>
      <h2>設計研究X數據分析</h2>
    </div>
    {/* <p className="home-lead">
      網站仍在持續調整中，歡迎向下瀏覽履歷與作品，或使用左側目錄快速導覽。
    </p> */}
    <div className="home-actions">
      <button type="button" className="home-action-btn" onClick={onNavigateCv}>
        快速前往 CV
      </button>
      <button
        type="button"
        className="home-action-btn is-accent"
        onClick={onNavigatePortfolio}
      >
        快速前往作品集
      </button>
    </div>
    <div className="home-intro">
      <p>
        我是佩恩，擁有 <strong>3 年半的工業設計實務經驗</strong>，參與從設計研發到量產的完整流程。
        在這段歷程中，我從競品分析出發，逐步開啟了數據分析的路線。
      </p>
      <p>
        研究所期間專注於 <strong>使用者研究</strong> 與 <strong>數據 / AI 應用</strong>，結合
        設計研究、資料洞察與技術評估，嘗試以跨領域視角發掘問題、提出解方。
      </p>
      <p>
        期待與你分享這些專案與思考，並探索更多合作的可能。
      </p>
    </div>
  </div>
);

export default HomeSection;
