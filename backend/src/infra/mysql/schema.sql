CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(64) UNIQUE NOT NULL,
  nickname VARCHAR(64),
  avatar VARCHAR(255),
  rank_score INT NOT NULL DEFAULT 1000,
  risk_tag VARCHAR(32) DEFAULT 'normal',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
  room_id VARCHAR(64) PRIMARY KEY,
  mode VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL,
  owner_uid BIGINT NOT NULL,
  rule_json JSON,
  started_at DATETIME,
  ended_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  room_id VARCHAR(64) NOT NULL,
  round_id VARCHAR(64) NOT NULL,
  uid BIGINT NOT NULL,
  score_delta INT NOT NULL,
  rank_no INT NOT NULL,
  result_json JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_uid_date(uid, created_at)
);

CREATE TABLE replays (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  room_id VARCHAR(64) NOT NULL,
  round_id VARCHAR(64) NOT NULL,
  event_blob_url VARCHAR(512) NOT NULL,
  keyframe_blob_url VARCHAR(512),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_room_round(room_id, round_id)
);

CREATE TABLE pay_orders (
  order_id VARCHAR(64) PRIMARY KEY,
  uid BIGINT NOT NULL,
  sku_id VARCHAR(64) NOT NULL,
  amount INT NOT NULL,
  status VARCHAR(16) NOT NULL,
  wx_txn_id VARCHAR(64),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME
);
