const fs = require('fs');
const path = require('path');
const logger = require('../logger');

/**
 * 데이터베이스 설정 관리 모듈
 * DB 정보 파일 로드 및 DB 설정 관리 기능을 담당
 */
class DatabaseConfigManager {
    constructor() {
        this.dbInfoPath = path.join(__dirname, '../../config/dbinfo.json');
        this.dbInfo = null;
    }

    /**
     * DB 정보 파일 로드
     * @returns {Promise<Object|null>} DB 정보 객체 또는 null
     */
    async loadDbInfo() {
        try {
            if (!fs.existsSync(this.dbInfoPath)) {
                logger.warn(`DB 정보 파일을 찾을 수 없습니다: ${this.dbInfoPath}`);
                return null;
            }

            const dbInfoData = fs.readFileSync(this.dbInfoPath, 'utf8');
            this.dbInfo = JSON.parse(dbInfoData);
            
            logger.info('DB 정보 파일 로드 완료', {
                path: this.dbInfoPath,
                availableDbs: Object.keys(this.dbInfo.dbs || {})
            });
            
            return this.dbInfo;
        } catch (error) {
            logger.error('DB 정보 파일 로드 실패', error);
            return null;
        }
    }

    /**
     * DB ID로 연결 정보 조회
     * @param {string} dbId - 데이터베이스 ID
     * @returns {Object} 데이터베이스 설정 객체
     */
    getDbConfigById(dbId) {
        if (!this.dbInfo || !this.dbInfo.dbs || !this.dbInfo.dbs[dbId]) {
            throw new Error(`DB ID '${dbId}'를 dbinfo.json에서 찾을 수 없습니다. 사용 가능한 DB: ${Object.keys(this.dbInfo?.dbs || {}).join(', ')}`);
        }
        
        const dbConfig = this.dbInfo.dbs[dbId];
        return {
            id: dbId,
            server: dbConfig.server,
            port: dbConfig.port || 1433,
            database: dbConfig.database,
            user: dbConfig.user,
            password: dbConfig.password,
            isWritable: dbConfig.isWritable ?? false, // 기본값은 읽기 전용
            description: dbConfig.description || `${dbId} 데이터베이스`,
            options: {
                encrypt: dbConfig.options?.encrypt ?? true,
                trustServerCertificate: dbConfig.options?.trustServerCertificate ?? true,
                enableArithAbort: dbConfig.options?.enableArithAbort ?? true,
                requestTimeout: dbConfig.options?.requestTimeout ?? 300000,
                connectionTimeout: dbConfig.options?.connectionTimeout ?? 30000
            }
        };
    }

    /**
     * 사용 가능한 모든 DB 목록 반환
     * @returns {Array} DB 목록
     */
    getAvailableDbs() {
        if (!this.dbInfo || !this.dbInfo.dbs) {
            return [];
        }
        
        return Object.keys(this.dbInfo.dbs).map(dbId => ({
            id: dbId,
            ...this.dbInfo.dbs[dbId]
        }));
    }

    /**
     * 특정 DB가 쓰기 가능한지 확인
     * @param {string} dbId - 데이터베이스 ID
     * @returns {boolean} 쓰기 가능 여부
     */
    isWritableDb(dbId) {
        try {
            const config = this.getDbConfigById(dbId);
            return config.isWritable === true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = DatabaseConfigManager;
