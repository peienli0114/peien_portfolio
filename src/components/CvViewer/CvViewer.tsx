import React from 'react';

type CvViewerProps = {
  src: string;
};

const CvViewer: React.FC<CvViewerProps> = ({ src }) => (
  <div className="pdf-container">
    <iframe
      src={src}
      title="CV PDF"
      className="content-pdf"
      aria-label="CV PDF"
    />
  </div>
);

export default CvViewer;
