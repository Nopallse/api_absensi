const { DinasSetjam, JamDinas, JamDinasDetail } = require('../models');

/**
 * Mendapatkan jam dinas yang efektif untuk unit kerja tertentu
 * Konsep inheritance: Bidang mewarisi jam dinas dari Satker jika tidak punya assignment sendiri
 * 
 * @param {string} idSatker - ID Satker
 * @param {string|null} idBidang - ID Bidang (opsional)
 * @returns {Promise<Array>} Array of jam dinas assignments
 */
const getEffectiveJamDinas = async (idSatker, idBidang = null) => {
  try {
    let jamDinasAssignments = [];
    let source = null;

    // 1. Cek jam dinas untuk Bidang (jika ada)
    if (idBidang) {
      jamDinasAssignments = await DinasSetjam.findAll({
        where: {
          id_satker: idSatker,
          id_bidang: idBidang,
          status: 1
        },
        include: [
          {
            model: JamDinas,
            as: 'jamDinas',
            where: { status: 1 },
            include: [
              {
                model: JamDinasDetail,
                as: 'details'
              }
            ]
          }
        ]
      });

      if (jamDinasAssignments.length > 0) {
        source = 'bidang';
        return formatJamDinasResponse(jamDinasAssignments, source);
      }
    }

    // 2. Fallback ke jam dinas Satker (inheritance)
    jamDinasAssignments = await DinasSetjam.findAll({
      where: {
        id_satker: idSatker,
        id_bidang: null,
        status: 1
      },
      include: [
        {
          model: JamDinas,
          as: 'jamDinas',
          where: { status: 1 },
          include: [
            {
              model: JamDinasDetail,
              as: 'details'
            }
          ]
        }
      ]
    });

    source = 'satker';
    return formatJamDinasResponse(jamDinasAssignments, source);

  } catch (error) {
    console.error('GetEffectiveJamDinas Error:', error);
    return [];
  }
};

/**
 * Format response jam dinas dengan informasi source
 */
const formatJamDinasResponse = (assignments, source) => {
  return assignments.map(assignment => ({
    assignmentId: assignment.dinset_id,
    assignmentName: assignment.dinset_nama,
    jamDinas: assignment.jamDinas,
    source: source, // 'satker' atau 'bidang'
    isInherited: source === 'satker' // true jika diwarisi dari satker
  }));
};

/**
 * Mendapatkan hierarki jam dinas untuk satker
 * Menampilkan jam dinas assignment untuk satker dan bidang
 */
const getJamDinasHierarchy = async (idSatker) => {
  try {
    const { SatkerTbl, BidangTbl } = require('../models');

    // Ambil info satker
    const satker = await SatkerTbl.findOne({
      where: { KDSATKER: idSatker, STATUS_SATKER: '1' },
      attributes: ['KDSATKER', 'NMSATKER']
    });

    if (!satker) {
      throw new Error('Satker tidak ditemukan');
    }

    // Jam dinas satker
    const satkerJamDinas = await getEffectiveJamDinas(idSatker);

    // Ambil semua bidang
    const bidangList = await BidangTbl.findAll({
      where: { KDSATKER: idSatker, STATUS_BIDANG: '1' },
      attributes: ['BIDANGF', 'NMBIDANG']
    });

    const bidangWithJamDinas = await Promise.all(
      bidangList.map(async (bidang) => {
        const jamDinas = await getEffectiveJamDinas(idSatker, bidang.BIDANGF);
        
        return {
          ...bidang.toJSON(),
          jamDinas: jamDinas
        };
      })
    );

    return {
      satker: {
        ...satker.toJSON(),
        jamDinas: satkerJamDinas
      },
      bidang: bidangWithJamDinas
    };

  } catch (error) {
    console.error('GetJamDinasHierarchy Error:', error);
    throw error;
  }
};

/**
 * Create atau update jam dinas assignment untuk unit kerja
 */
const createOrUpdateJamDinasAssignment = async (assignmentData) => {
  try {
    const {
      idSatker,
      idBidang = null,
      idJamDinas,
      assignmentName,
      status = 1
    } = assignmentData;

    // Validasi
    if (!idSatker || !idJamDinas) {
      throw new Error('idSatker dan idJamDinas wajib diisi');
    }

    // Ambil KDSKPD dan NMSATKER dari SatkerTbl
    const { SatkerTbl } = require('../models');
    const satker = await SatkerTbl.findOne({
      where: { KDSATKER: idSatker },
      attributes: ['KDSKPD', 'NMSATKER']
    });

    if (!satker) {
      throw new Error('Satker tidak ditemukan');
    }

    const idSkpd = satker.KDSKPD;
    // Gunakan nama satker sebagai assignment name
    const finalAssignmentName = assignmentName || satker.NMSATKER;

    // Cek apakah sudah ada assignment
    const whereCondition = {
      id_satker: idSatker,
      id_bidang: idBidang
    };

    const existingAssignment = await DinasSetjam.findOne({
      where: whereCondition
    });

    let assignment;

    if (existingAssignment) {
      // Update existing
      await existingAssignment.update({
        id_jamdinas: idJamDinas,
        dinset_nama: finalAssignmentName,
        status: status,
        id_skpd: idSkpd
      });
      assignment = existingAssignment;
    } else {
      // Create new
      assignment = await DinasSetjam.create({
        dinset_nama: finalAssignmentName,
        id_skpd: idSkpd,
        id_satker: idSatker,
        id_bidang: idBidang,
        id_jamdinas: idJamDinas,
        status: status
      });
    }

    // Reload dengan relasi
    const result = await DinasSetjam.findByPk(assignment.dinset_id, {
      include: [
        {
          model: JamDinas,
          as: 'jamDinas',
          include: [
            {
              model: JamDinasDetail,
              as: 'details'
            }
          ]
        }
      ]
    });

    return result;

  } catch (error) {
    console.error('CreateOrUpdateJamDinasAssignment Error:', error);
    throw error;
  }
};

/**
 * Hapus jam dinas assignment
 */
const deleteJamDinasAssignment = async (assignmentId) => {
  try {
    const assignment = await DinasSetjam.findByPk(assignmentId);

    if (!assignment) {
      throw new Error('Assignment tidak ditemukan');
    }

    await assignment.destroy();

    return { message: 'Assignment berhasil dihapus' };

  } catch (error) {
    console.error('DeleteJamDinasAssignment Error:', error);
    throw error;
  }
};

module.exports = {
  getEffectiveJamDinas,
  getJamDinasHierarchy,
  createOrUpdateJamDinasAssignment,
  deleteJamDinasAssignment
};
