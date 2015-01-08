module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                process: function(src, filepath) {
                    return '/* File ' + filepath + '*/\n' + src;
                }
            },
            dist: {
                // the files to concatenate
                src: [
                      'jit/narcissus/jsdefs.js',
                      'jit/narcissus/jslex.js',
                      'jit/narcissus/jsparse.js',
                      'jit/narcissus/jsdecomp.js',
                      'jit/compiler/definitions.js',
                      'jit/compiler/helper.js',
                      'jit/compiler/runtimes.js',
                      'ParallelArray.js',
                      'jit/compiler/driver.js',
                      'jit/compiler/dotviz.js',
                      'jit/compiler/typeinference.js',
                      'jit/compiler/rangeanalysis.js',
                      'jit/compiler/inferblockflow.js',
                      'jit/compiler/infermem.js',
                      'jit/compiler/genOCL.js',
                      'jit/compiler/runOCL.js'],
                // the location of the resulting JS file
                dest: '../dist/<%= pkg.name %>.js'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("mm-dd-yyyy") %> */\n'
            },
            dist: {
                files: {
                    '../dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        }
    });


    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('default', ['concat', 'uglify']);

};
