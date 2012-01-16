#include <stdio.h>
#include <time.h>
#include <sys/time.h>

double **genMatrix(int sizex_A, int sizey_A, double val) {
	double **result = (double **)malloc(sizex_A*sizeof(double *));
	int i, j;
	for(i=0;i<sizex_A;i++) {
		result[i] = (double *)malloc(sizey_A*sizeof(double));
		//memset(((void *)result[i]), val, sizey_A*sizeof(double));
		for(j=0;j<sizey_A;j++) {
			result[i][j] = val;
		}
	}
	return result;
}


void freeMatrix(double **A, int sizex_A) {
	int i,j;
	for(i=0;i<sizex_A;i++) {
		free(A[i]);
	}
	free(A);
}

double *genFlatMatrix(int sizex_A, int sizey_A, double val) {
	double *result = (double *)malloc(sizex_A*sizey_A*sizeof(double));
	int i; int length = sizex_A*sizey_A;
	for(i=0;i<length;i++) {
		result[i] = val;
	}
	return result;
}

void freeFlatMatrix(double *A) {
	free(A);
}

double sumMatrix(double **A, int sizex_A, int sizey_A) {
	int i,j; double sum = 0;
	for(i=0;i<sizex_A;i++) {
		for(j=0;j<sizey_A;j++) {
			sum += A[i][j];
		}
	}
	return sum;
}


double Mul2D(double **A, int sizex_A, int sizey_A, double **B, int sizex_B, int sizey_B) {
	int i, j, k;
	double **C = genMatrix(sizex_A, sizey_B, 0);
	for(i=0;i<sizex_A;i++) {
		for(j=0;j<sizey_B;j++) {
			for(k=0;k<sizey_A;k++) {
				C[i][j] += A[i][k] * B[k][j];
			}
		}
	}
	double ret = C[999][999];
	freeMatrix(C, sizex_A);
	return ret;
}

double Mul1D(double *A, int sizex_A, int sizey_A, double *B, int sizex_B, int sizey_B) {
	double *C = genFlatMatrix(sizex_A, sizey_B, 4);
	int i,j,k;
	int r_index;
	for(i=0;i<sizex_A;i++) {
		for(j=0;j<sizey_B;j++) {
			r_index = i*sizey_A+j;
			for(k=0;k<sizey_A;k++) {
				C[r_index] += A[i*sizey_A+k] * B[k*sizey_B+j];
			}
		}
	}
	double ret = C[999999];
	free(C);
	return ret;	
}



void driver_2DMul() {
	int sizex_A = 1000;
	int sizey_A = 1000;
	int sizex_B = 1000;
	int sizey_B = 1000;
	double **A = genMatrix(sizex_A, sizey_A, 4);
	double **B = genMatrix(sizex_B, sizey_B, 4);
	//double test = sumMatrix(A, 1000,1000);	
	double check = Mul2D(A, sizex_A, sizey_A, B, sizex_B, sizey_B);
	printf("%f\n", check);
	freeMatrix(A, sizex_A);
	freeMatrix(B, sizex_B);
}

void driver_1DMul() {
	int sizex_A = 1000;
	int sizey_A = 1000;
	int sizex_B = 1000;
	int sizey_B = 1000;
	double *A = genFlatMatrix(sizex_A, sizey_A, 4);
	double *B = genFlatMatrix(sizex_B, sizey_B, 4);
	double check = Mul1D(A, sizex_A, sizey_A, B, sizex_B, sizey_B);
	printf("%f\n", check);
	free(A);free(B);
	return;
}

main() {
	struct timeval start, end;
	double num_secs;

	printf("Starting 2D Multiply...\n");
	gettimeofday(&start, NULL);
	driver_2DMul();
	gettimeofday(&end, NULL);
	num_secs = (end.tv_sec*1000000 + (end.tv_usec)) - (start.tv_sec*1000000 + (start.tv_usec));
	printf("Time elapsed = %.6lf seconds\n", num_secs/1000000);

	printf("Starting 1D Multiply...\n");
	gettimeofday(&start, NULL);
	driver_1DMul();
	gettimeofday(&end, NULL);
	num_secs = (end.tv_sec*1000000 + (end.tv_usec)) - (start.tv_sec*1000000 + (start.tv_usec));
	printf("Time elapsed = %.6lf seconds\n", num_secs/1000000);

}
