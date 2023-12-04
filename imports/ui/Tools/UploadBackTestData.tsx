import React from 'react';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { message, Upload } from 'antd';

const { Dragger } = Upload;

const props: UploadProps = {
  name: 'file',
  multiple: true,
  action: 'https://run.mocky.io/v3/435e224c-44fb-4773-9faf-380c5e6a2188',
  onChange(info) {
    const { status } = info.file;
    if (status !== 'uploading') {
      console.log(info.file, info.fileList);
    }
    if (status === 'done') {
      message.success(`${info.file.name} file uploaded successfully.`).then(r => {});
    } else if (status === 'error') {
      message.error(`${info.file.name} file upload failed.`).then(r => {});
    }
  },
  onDrop(e) {
    console.log('Dropped files', e.dataTransfer.files);
  },
};

const UploadBackTestData: React.FC = () => (
  <Dragger {...props}>
    <p className="ant-upload-drag-icon">
      <InboxOutlined />
    </p>
    <p className="ant-upload-text">Click here or drag file(s) to this area to upload.</p>
    <p className="ant-upload-hint">
      Files must be Excel file format (*.xlsx) and be DateTime, Open, High, Low, Close, Volume, TimeStamp, NYTime, TimeOfDay pattern.
    </p>
  </Dragger>
);

export default UploadBackTestData;