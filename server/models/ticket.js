exports = module.exports = function (app, mongoose) {
    var ticketSchema = new mongoose.Schema({
        Activo: {
            type: Boolean
        },
        Causa: {
            type: String
        },
        Descripcion: {
            type: String
        },
        DescripcionIncidente: {
            type: String
        },
        EstatusIncidente: {
            type: Object
        },
        Grupo: {
            type: String
        },
        IdAgente: {
            type: Number
        },
        IdCategoria: {
            type: Number
        },
        IdCategoriaNegocio: {
            type: Number
        },
        IdCausa: {
            type: Number
        },
        IdCentroCosto: {
            type: Number
        },
        IdClasificacion: {
            type: Number
        },
        IdLocalidad: {
            type: Number
        },
        IdUsuario: {
            type: Number
        },
        Descripcion: {
            type: String
        },
        DescripcionIncidente: {
            type: String
        },
        IdFuente: {
            type: Number
        },
        IdGrupo: {
            type: Number
        },
        IdImpacto: {
            type: Number
        },
        IdIncidente: {
            type: Number
        },
        IdPlantillaRegistro: {
            type: Number
        },
        IdPlantillaRespuesta: {
            type: Number
        },
        IdSubCategoria: {
            type: Number
        },
        IdTipoEntidadRelacion: {
            type: Number
        },
        IdUrgencia: {
            type: Number
        },
        IdUsuario: {
            type: Number
        },
        Nombre: {
            type: String
        },
        Objetivo: {
            type: String
        },
        Prioridad: {
            type: Object
        },
        Solucion: {
            type: String
        },
        SubCategoria: {
            type: String
        },
        Titulo: {
            type: String
        },
        Empresa: {
            type: String
        }
    }, {
        collection: 'tickets',
            usePushEach: true,
            timestamps: true
        });
    mongoose.model('ticket', ticketSchema);
}
