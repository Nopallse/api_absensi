'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First, drop the incorrect foreign key constraint if it exists
      await queryInterface.sequelize.query(`
        ALTER TABLE master_jadwal_kegiatan 
        DROP FOREIGN KEY IF EXISTS master_jadwal_kegiatan_ibfk_1
      `);
      
      // Remove any index related to the wrong foreign key
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE master_jadwal_kegiatan 
          DROP INDEX IF EXISTS master_jadwal_kegiatan_ibfk_1
        `);
      } catch (error) {
        console.log('Index does not exist, continuing...');
      }
      
      // Check if the table structure is correct
      const [masterTableInfo] = await queryInterface.sequelize.query(`
        DESCRIBE master_jadwal_kegiatan
      `);
      
      console.log('Current master_jadwal_kegiatan structure:', masterTableInfo);
      
      // Ensure the master_jadwal_kegiatan table has the correct structure
      const masterTableExists = await queryInterface.sequelize.query(`
        SHOW TABLES LIKE 'master_jadwal_kegiatan'
      `);
      
      if (masterTableExists[0].length === 0) {
        // Create the table if it doesn't exist
        await queryInterface.createTable('master_jadwal_kegiatan', {
          id_kegiatan: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
          },
          tanggal_kegiatan: {
            type: Sequelize.DATEONLY,
            allowNull: false,
            comment: 'Tanggal kegiatan dalam format YYYY-MM-DD'
          },
          jenis_kegiatan: {
            type: Sequelize.STRING(50),
            allowNull: false,
            comment: 'Jenis kegiatan (Apel Gabungan, Wirid, Senam, dll)'
          },
          keterangan: {
            type: Sequelize.STRING(200),
            allowNull: false,
            comment: 'Keterangan detail kegiatan'
          }
        });
      } else {
        // Check if jenis_kegiatan field needs to be modified
        const [columnInfo] = await queryInterface.sequelize.query(`
          SHOW COLUMNS FROM master_jadwal_kegiatan LIKE 'jenis_kegiatan'
        `);
        
        if (columnInfo.length > 0) {
          const column = columnInfo[0];
          // If it's not a VARCHAR, change it
          if (!column.Type.includes('varchar') && !column.Type.includes('text')) {
            await queryInterface.changeColumn('master_jadwal_kegiatan', 'jenis_kegiatan', {
              type: Sequelize.STRING(50),
              allowNull: false,
              comment: 'Jenis kegiatan (Apel Gabungan, Wirid, Senam, dll)'
            });
          }
        }
      }
      
      // Ensure the jadwal_kegiatan_lokasi_skpd table exists and has the correct foreign key
      const jkTableExists = await queryInterface.sequelize.query(`
        SHOW TABLES LIKE 'jadwal_kegiatan_lokasi_skpd'
      `);
      
      if (jkTableExists[0].length === 0) {
        // Create the junction table if it doesn't exist
        await queryInterface.createTable('jadwal_kegiatan_lokasi_skpd', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
          },
          id_kegiatan: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'master_jadwal_kegiatan',
              key: 'id_kegiatan'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          lokasi_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'lokasi',
              key: 'lokasi_id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          kdskpd: {
            type: Sequelize.STRING(10),
            allowNull: false,
            comment: 'Kode SKPD yang diarahkan ke lokasi ini'
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
          }
        });
      } else {
        // Check if the correct foreign key exists
        const [constraints] = await queryInterface.sequelize.query(`
          SELECT 
            CONSTRAINT_NAME,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE 
            TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'jadwal_kegiatan_lokasi_skpd'
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        
        const hasCorrectFK = constraints.some(c => 
          c.REFERENCED_TABLE_NAME === 'master_jadwal_kegiatan' && 
          c.COLUMN_NAME === 'id_kegiatan'
        );
        
        if (!hasCorrectFK) {
          // Add the correct foreign key
          await queryInterface.addConstraint('jadwal_kegiatan_lokasi_skpd', {
            fields: ['id_kegiatan'],
            type: 'foreign key',
            name: 'fk_jadwal_kegiatan_lokasi_skpd_master',
            references: {
              table: 'master_jadwal_kegiatan',
              field: 'id_kegiatan'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          });
        }
      }
      
      console.log('Migration completed successfully');
      
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove the foreign key constraint
      await queryInterface.removeConstraint('jadwal_kegiatan_lokasi_skpd', 'fk_jadwal_kegiatan_lokasi_skpd_master');
      
      // Optionally drop tables (be careful with this in production)
      // await queryInterface.dropTable('jadwal_kegiatan_lokasi_skpd');
      // await queryInterface.dropTable('master_jadwal_kegiatan');
      
    } catch (error) {
      console.error('Rollback error:', error);
      throw error;
    }
  }
};
